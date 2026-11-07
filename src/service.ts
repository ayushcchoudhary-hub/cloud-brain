import { randomBytes, randomUUID } from "node:crypto";

import type { Config } from "./config.js";
import { evaluatePull } from "./eval.js";
import { buyerUsage, checkSpend, nextReputation, priceFor, type SpendLimits } from "./pricing.js";
import { scanPromptInjection, verifyContentHash } from "./safety.js";
import { confidenceFor, rerank } from "./search/rerank.js";
import type { Store } from "./store/types.js";
import { extractiveSynthesis, openAiSynthesis } from "./synth.js";
import type {
  Citation,
  Contributor,
  EvalResult,
  Feedback,
  MarketplaceSummary,
  Payment,
  Quote,
  Receipt,
  SafetyReport,
  SearchResult,
  WikiPage
} from "./types.js";

export interface SearchOptions {
  limit?: number;
  /** Only this contributor's pages. */
  contributorHandle?: string;
  includeOwn?: boolean;
}

export interface Match {
  /** The page to offer: own wiki first if it clears the own bar, else the best network page. */
  top: SearchResult;
  /** When `top` is from your own wiki, the best paid alternative from someone else, if any. */
  alternative?: SearchResult;
  results: SearchResult[];
}

export type PullOutcome =
  | { status: "no_match" }
  | { status: "blocked_by_limit"; reason: string; message: string; amountUsdc: number; contributor: string }
  | { status: "blocked_by_safety"; safety: SafetyReport }
  | {
      status: "delivered";
      source: "own" | "network";
      contributor: string;
      synthesis: string;
      citations: Citation[];
      receipt?: Receipt;
      safety: SafetyReport;
      eval: EvalResult;
    };

export interface PublishResult {
  contributor: Contributor;
  published: number;
  quarantined: Array<{ pagePath: string; patterns: string[] }>;
}

export interface CloudBrainService {
  readonly config: Config;
  publish(handle: string, displayName: string, pages: WikiPage[]): Promise<PublishResult>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  findMatch(query: string, options?: SearchOptions): Promise<Match | null>;
  pull(query: string, options?: PullOptions): Promise<PullOutcome>;
  createQuote(query: string, options?: PullOptions): Promise<Quote | null>;
  settleQuote(quoteId: string, buyerId?: string): Promise<PullOutcome | { status: "quote_invalid"; message: string }>;
  feedback(input: {
    receiptId: string;
    useful: boolean;
    rating?: number;
    comment?: string;
  }): Promise<Feedback & { contributorDisplayName: string; reputation?: number }>;
  history(options?: { buyerId?: string; limit?: number }): Promise<Array<{ payment: Payment; feedback?: Feedback }>>;
  summary(): Promise<MarketplaceSummary>;
}

export interface PullOptions {
  contributorHandle?: string;
  buyerId?: string;
  /** Lower the per-pull cap for this call only. */
  maxPriceUsdc?: number;
}

const newReceiptId = () => `sim_${randomBytes(6).toString("hex")}`;

export function createService(store: Store, config: Config): CloudBrainService {
  const t = config.thresholds;

  async function publish(handle: string, displayName: string, pages: WikiPage[]): Promise<PublishResult> {
    const contributor = await store.upsertContributor({ handle, displayName });
    const quarantined: PublishResult["quarantined"] = [];
    const clean: WikiPage[] = [];
    for (const page of pages) {
      const scan = scanPromptInjection(page.content);
      if (scan.flagged) quarantined.push({ pagePath: page.pagePath, patterns: scan.matches });
      else clean.push(page);
    }
    const published = await store.upsertPages(contributor.id, clean);
    return { contributor, published, quarantined };
  }

  async function search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const limit = options.limit ?? 6;
    const hits = (await store.searchPages(query, Math.max(limit * 8, 30))).filter(
      (hit) => hit.score >= t.candidateFloor
    );
    const contributors = new Map(
      (await store.getContributors([...new Set(hits.map((h) => h.contributorId))])).map((c) => [c.id, c])
    );

    const enriched = hits.flatMap((hit) => {
      const c = contributors.get(hit.contributorId);
      if (!c) return [];
      const isOwn = c.handle === config.ownHandle;
      if (options.contributorHandle && c.handle !== options.contributorHandle) return [];
      if (options.includeOwn === false && isOwn) return [];
      return [
        {
          ...hit,
          contributorHandle: c.handle,
          contributorDisplayName: c.displayName,
          contributorReputation: c.reputation,
          isOwn,
          priceUsdc: isOwn ? 0 : priceFor(hit.depthScore, c.reputation)
        }
      ];
    });

    return rerank(query, enriched, limit, t.rawScale).map((row) => ({
      ...row,
      confidence: confidenceFor(row.score, t)
    }));
  }

  async function findMatch(query: string, options: SearchOptions = {}): Promise<Match | null> {
    const results = await search(query, { ...options, limit: options.limit ?? 12 });
    const own = results.filter((r) => r.isOwn && r.score >= t.ownConfident);
    const network = results.filter((r) => !r.isOwn && r.score >= t.confident);
    const top = own[0] ?? network[0];
    if (!top) return null;
    return { top, alternative: top.isOwn ? network[0] : undefined, results };
  }

  async function synthesize(query: string, pages: SearchResult[]): Promise<string> {
    return config.synthMode === "openai"
      ? openAiSynthesis(query, pages, config.synthModel)
      : extractiveSynthesis(query, pages);
  }

  /** Safety-check, synthesise, and (for network pages) record a simulated charge. */
  async function deliver(
    query: string,
    top: SearchResult,
    results: SearchResult[],
    buyerId: string,
    limits: SpendLimits,
    quote?: Quote
  ): Promise<PullOutcome> {
    const amountUsdc = quote?.amountUsdc ?? top.priceUsdc;
    if (!top.isOwn) {
      const usage = buyerUsage(await store.listPayments({ buyerId }));
      const decision = checkSpend(amountUsdc, usage, limits);
      if (!decision.ok) {
        return {
          status: "blocked_by_limit",
          reason: decision.reason,
          message: decision.message,
          amountUsdc,
          contributor: top.contributorDisplayName
        };
      }
    }

    // Deliver the top page plus other close pages from the same contributor.
    const candidates = results
      .filter((r) => r.contributorId === top.contributorId && r.score >= t.ownConfident * 0.8)
      .slice(0, 3);
    if (!candidates.includes(top)) candidates.unshift(top);

    const safety: SafetyReport = { injectionDropped: [], hashMismatchDropped: [] };
    const delivered = candidates.filter((page) => {
      const scan = scanPromptInjection(page.content);
      if (scan.flagged) {
        safety.injectionDropped.push({ pagePath: page.pagePath, patterns: scan.matches });
        return false;
      }
      if (!verifyContentHash(page.content, page.contentHash)) {
        safety.hashMismatchDropped.push(page.pagePath);
        return false;
      }
      return true;
    });
    if (delivered.length === 0 || delivered[0] !== top) {
      return { status: "blocked_by_safety", safety };
    }

    const synthesis = await synthesize(query, delivered);
    const citations: Citation[] = delivered.map((p) => ({
      contributor: p.contributorDisplayName,
      pageTitle: p.pageTitle,
      pagePath: p.pagePath,
      score: p.score
    }));

    let receipt: Receipt | undefined;
    if (!top.isOwn) {
      const payment = await store.recordPayment({
        receiptId: newReceiptId(),
        query,
        buyerId,
        contributorId: top.contributorId,
        contributorDisplayName: top.contributorDisplayName,
        amountUsdc,
        matchedPagePath: top.pagePath,
        matchedPageTitle: top.pageTitle,
        quoteId: quote?.id,
        createdAt: new Date().toISOString()
      });
      const [seller] = await store.getContributors([top.contributorId]);
      if (seller) {
        await store.updateContributor(seller.id, {
          totalPulls: seller.totalPulls + 1,
          totalEarningsUsdc: Number((seller.totalEarningsUsdc + amountUsdc).toFixed(2))
        });
      }
      receipt = {
        receiptId: payment.receiptId,
        amountUsdc,
        currency: "USDC",
        simulated: true,
        payee: top.contributorDisplayName,
        createdAt: payment.createdAt
      };
    }

    return {
      status: "delivered",
      source: top.isOwn ? "own" : "network",
      contributor: top.contributorDisplayName,
      synthesis,
      citations,
      receipt,
      safety,
      eval: evaluatePull(synthesis, delivered)
    };
  }

  function limitsFor(options: PullOptions): SpendLimits {
    return options.maxPriceUsdc === undefined
      ? config.limits
      : { ...config.limits, perPullMaxUsdc: Math.min(config.limits.perPullMaxUsdc, options.maxPriceUsdc) };
  }

  async function pull(query: string, options: PullOptions = {}): Promise<PullOutcome> {
    const match = await findMatch(query, { contributorHandle: options.contributorHandle });
    if (!match) return { status: "no_match" };
    return deliver(query, match.top, match.results, options.buyerId ?? config.buyerId, limitsFor(options));
  }

  async function createQuote(query: string, options: PullOptions = {}): Promise<Quote | null> {
    const match = await findMatch(query, {
      contributorHandle: options.contributorHandle,
      includeOwn: false
    });
    if (!match) return null;
    const now = Date.now();
    return store.saveQuote({
      id: randomUUID(),
      query,
      buyerId: options.buyerId ?? config.buyerId,
      contributorId: match.top.contributorId,
      contributorDisplayName: match.top.contributorDisplayName,
      amountUsdc: match.top.priceUsdc,
      topPagePath: match.top.pagePath,
      topPageTitle: match.top.pageTitle,
      matchScore: match.top.score,
      status: "quoted",
      expiresAt: new Date(now + config.quoteTtlMinutes * 60_000).toISOString(),
      createdAt: new Date(now).toISOString()
    });
  }

  async function settleQuote(quoteId: string, buyerId = config.buyerId) {
    const quote = await store.getQuote(quoteId);
    if (!quote || quote.buyerId !== buyerId) {
      return { status: "quote_invalid" as const, message: "Unknown quote id." };
    }
    if (quote.status !== "quoted") {
      return { status: "quote_invalid" as const, message: `Quote is already ${quote.status}.` };
    }
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      await store.setQuoteStatus(quote.id, "expired");
      return { status: "quote_invalid" as const, message: "Quote expired. Ask for a new one." };
    }
    const results = await search(quote.query, { limit: 12 });
    const top = results.find((r) => r.contributorId === quote.contributorId && r.pagePath === quote.topPagePath);
    if (!top) return { status: "quote_invalid" as const, message: "Quoted page is no longer available." };
    const outcome = await deliver(quote.query, top, results, buyerId, config.limits, quote);
    if (outcome.status === "delivered") await store.setQuoteStatus(quote.id, "settled");
    return outcome;
  }

  async function feedback(input: { receiptId: string; useful: boolean; rating?: number; comment?: string }) {
    const payment = await store.getPayment(input.receiptId);
    if (!payment) throw new Error(`No simulated payment with receipt ${input.receiptId}.`);
    const existing = await store.listFeedback({ receiptIds: [input.receiptId] });
    if (existing.length > 0) throw new Error("Feedback was already recorded for this receipt.");

    const rating = input.rating === undefined ? undefined : Math.max(1, Math.min(5, Math.round(input.rating)));
    const saved = await store.recordFeedback({
      receiptId: input.receiptId,
      useful: input.useful,
      rating,
      comment: input.comment,
      contributorId: payment.contributorId,
      buyerId: payment.buyerId,
      createdAt: new Date().toISOString()
    });
    const [seller] = await store.getContributors([payment.contributorId]);
    const reputation = seller ? nextReputation(seller.reputation, input.useful, rating) : undefined;
    if (seller) await store.updateContributor(seller.id, { reputation });
    return { ...saved, contributorDisplayName: payment.contributorDisplayName, reputation };
  }

  async function history(options: { buyerId?: string; limit?: number } = {}) {
    const payments = await store.listPayments({ buyerId: options.buyerId, limit: options.limit ?? 20 });
    const feedbackRows = await store.listFeedback({ receiptIds: payments.map((p) => p.receiptId) });
    const byReceipt = new Map(feedbackRows.map((f) => [f.receiptId, f]));
    return payments.map((payment) => ({ payment, feedback: byReceipt.get(payment.receiptId) }));
  }

  async function summary(): Promise<MarketplaceSummary> {
    const [payments, feedbackRows, contributors, quotesCreated] = await Promise.all([
      store.listPayments(),
      store.listFeedback(),
      store.getContributors(),
      store.countQuotes()
    ]);
    const gross = payments.reduce((sum, p) => sum + p.amountUsdc, 0);
    return {
      totalPulls: payments.length,
      grossVolumeUsdc: Number(gross.toFixed(2)),
      averageTicketUsdc: payments.length ? Number((gross / payments.length).toFixed(2)) : 0,
      quotesCreated,
      feedbackCount: feedbackRows.length,
      usefulFeedbackRate: feedbackRows.length
        ? Number((feedbackRows.filter((f) => f.useful).length / feedbackRows.length).toFixed(3))
        : 0,
      topContributors: contributors
        .sort((a, b) => b.totalEarningsUsdc - a.totalEarningsUsdc)
        .slice(0, 5)
        .map(({ handle, displayName, reputation, totalPulls, totalEarningsUsdc }) => ({
          handle,
          displayName,
          reputation,
          totalPulls,
          totalEarningsUsdc
        }))
    };
  }

  return { config, publish, search, findMatch, pull, createQuote, settleQuote, feedback, history, summary };
}
