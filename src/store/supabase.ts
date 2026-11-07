/**
 * Supabase + pgvector backend. OPTIONAL AND UNTESTED in this cleaned-up repo:
 * it typechecks against supabase/schema.sql but is not exercised by the tests or the demo.
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY (for embeddings).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";

import type { Contributor, Feedback, PageHit, Payment, Quote, QuoteStatus, WikiPage } from "../types.js";
import type { ContributorPatch, PaymentFilter, Store } from "./types.js";

type Row = Record<string, unknown>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0);

function toContributor(r: Row): Contributor {
  return {
    id: str(r.id),
    handle: str(r.handle),
    displayName: str(r.display_name),
    reputation: num(r.reputation),
    totalPulls: num(r.total_pulls),
    totalEarningsUsdc: num(r.total_earnings_usdc)
  };
}

function toQuote(r: Row): Quote {
  return {
    id: str(r.id),
    query: str(r.query),
    buyerId: str(r.buyer_id),
    contributorId: str(r.contributor_id),
    contributorDisplayName: str(r.contributor_display_name),
    amountUsdc: num(r.amount_usdc),
    topPagePath: str(r.top_page_path),
    topPageTitle: str(r.top_page_title),
    matchScore: num(r.match_score),
    status: str(r.status) as QuoteStatus,
    expiresAt: str(r.expires_at),
    createdAt: str(r.created_at)
  };
}

function toPayment(r: Row): Payment {
  return {
    receiptId: str(r.receipt_id),
    query: str(r.query),
    buyerId: str(r.buyer_id),
    contributorId: str(r.contributor_id),
    contributorDisplayName: str(r.contributor_display_name),
    amountUsdc: num(r.amount_usdc),
    matchedPagePath: str(r.matched_page_path),
    matchedPageTitle: str(r.matched_page_title),
    quoteId: str(r.quote_id) || undefined,
    createdAt: str(r.created_at)
  };
}

function toFeedback(r: Row): Feedback {
  return {
    receiptId: str(r.receipt_id),
    useful: Boolean(r.useful),
    rating: r.rating === null || r.rating === undefined ? undefined : num(r.rating),
    comment: str(r.comment) || undefined,
    contributorId: str(r.contributor_id),
    buyerId: str(r.buyer_id),
    createdAt: str(r.created_at)
  };
}

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private db: SupabaseClient;
  private openai = new OpenAI();

  constructor(url: string, serviceRoleKey: string, private embedModel: string) {
    this.db = createClient(url, serviceRoleKey);
  }

  private async embed(input: string): Promise<string> {
    const response = await this.openai.embeddings.create({ model: this.embedModel, input });
    const vector = response.data[0]?.embedding;
    if (!vector) throw new Error("Embedding API returned no vector");
    return `[${vector.join(",")}]`;
  }

  async upsertContributor(input: { handle: string; displayName: string }): Promise<Contributor> {
    const row = check(
      await this.db
        .from("contributors")
        .upsert({ handle: input.handle, display_name: input.displayName }, { onConflict: "handle" })
        .select()
        .single(),
      "upsert contributor"
    );
    return toContributor(row as Row);
  }

  async getContributors(ids?: string[]): Promise<Contributor[]> {
    let query = this.db.from("contributors").select();
    if (ids) query = query.in("id", ids);
    return (check(await query, "get contributors") as Row[]).map(toContributor);
  }

  async updateContributor(id: string, patch: ContributorPatch): Promise<void> {
    const row: Row = {};
    if (patch.displayName !== undefined) row.display_name = patch.displayName;
    if (patch.reputation !== undefined) row.reputation = patch.reputation;
    if (patch.totalPulls !== undefined) row.total_pulls = patch.totalPulls;
    if (patch.totalEarningsUsdc !== undefined) row.total_earnings_usdc = patch.totalEarningsUsdc;
    check(await this.db.from("contributors").update(row).eq("id", id), "update contributor");
  }

  async upsertPages(contributorId: string, pages: WikiPage[]): Promise<number> {
    const rows: Row[] = [];
    for (const page of pages) {
      rows.push({
        contributor_id: contributorId,
        page_title: page.pageTitle,
        page_path: page.pagePath,
        summary: page.summary,
        topics: page.topics,
        source_count: page.sourceCount,
        depth_score: page.depthScore,
        content_hash: page.contentHash,
        content: page.content,
        embedding: await this.embed(`${page.pageTitle}\n\n${page.summary}\n\n${page.content}`),
        last_updated: page.lastUpdated
      });
    }
    check(
      await this.db.from("pages").upsert(rows, { onConflict: "contributor_id,page_path" }),
      "upsert pages"
    );
    return rows.length;
  }

  async searchPages(query: string, limit: number): Promise<PageHit[]> {
    const rows = check(
      await this.db.rpc("match_pages", {
        query_embedding: await this.embed(query),
        match_threshold: 0,
        match_count: limit
      }),
      "match_pages"
    ) as Row[];
    return rows.map((r) => ({
      pageId: str(r.id),
      contributorId: str(r.contributor_id),
      pageTitle: str(r.page_title),
      pagePath: str(r.page_path),
      summary: str(r.summary),
      topics: Array.isArray(r.topics) ? (r.topics as string[]) : [],
      depthScore: num(r.depth_score),
      sourceCount: num(r.source_count),
      contentHash: str(r.content_hash),
      content: str(r.content),
      score: Math.max(0, Math.min(1, num(r.similarity)))
    }));
  }

  async saveQuote(quote: Quote): Promise<Quote> {
    const row = check(
      await this.db
        .from("quotes")
        .insert({
          id: quote.id,
          query: quote.query,
          buyer_id: quote.buyerId,
          contributor_id: quote.contributorId,
          contributor_display_name: quote.contributorDisplayName,
          amount_usdc: quote.amountUsdc,
          top_page_path: quote.topPagePath,
          top_page_title: quote.topPageTitle,
          match_score: quote.matchScore,
          status: quote.status,
          expires_at: quote.expiresAt
        })
        .select()
        .single(),
      "save quote"
    );
    return toQuote(row as Row);
  }

  async getQuote(id: string): Promise<Quote | null> {
    const row = check(await this.db.from("quotes").select().eq("id", id).maybeSingle(), "get quote");
    return row ? toQuote(row as Row) : null;
  }

  async setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
    check(await this.db.from("quotes").update({ status }).eq("id", id), "set quote status");
  }

  async countQuotes(): Promise<number> {
    const result = await this.db.from("quotes").select("id", { count: "exact", head: true });
    check(result, "count quotes");
    return result.count ?? 0;
  }

  async recordPayment(payment: Payment): Promise<Payment> {
    const row = check(
      await this.db
        .from("payments")
        .insert({
          receipt_id: payment.receiptId,
          query: payment.query,
          buyer_id: payment.buyerId,
          contributor_id: payment.contributorId,
          contributor_display_name: payment.contributorDisplayName,
          amount_usdc: payment.amountUsdc,
          matched_page_path: payment.matchedPagePath,
          matched_page_title: payment.matchedPageTitle,
          quote_id: payment.quoteId ?? null
        })
        .select()
        .single(),
      "record payment"
    );
    return toPayment(row as Row);
  }

  async getPayment(receiptId: string): Promise<Payment | null> {
    const row = check(
      await this.db.from("payments").select().eq("receipt_id", receiptId).maybeSingle(),
      "get payment"
    );
    return row ? toPayment(row as Row) : null;
  }

  async listPayments(filter: PaymentFilter = {}): Promise<Payment[]> {
    let query = this.db.from("payments").select().order("created_at", { ascending: false });
    if (filter.buyerId) query = query.eq("buyer_id", filter.buyerId);
    if (filter.contributorId) query = query.eq("contributor_id", filter.contributorId);
    if (filter.since) query = query.gte("created_at", filter.since.toISOString());
    if (filter.limit) query = query.limit(filter.limit);
    return (check(await query, "list payments") as Row[]).map(toPayment);
  }

  async recordFeedback(feedback: Feedback): Promise<Feedback> {
    const row = check(
      await this.db
        .from("feedback")
        .insert({
          receipt_id: feedback.receiptId,
          useful: feedback.useful,
          rating: feedback.rating ?? null,
          comment: feedback.comment ?? null,
          contributor_id: feedback.contributorId,
          buyer_id: feedback.buyerId
        })
        .select()
        .single(),
      "record feedback"
    );
    return toFeedback(row as Row);
  }

  async listFeedback(filter: { receiptIds?: string[] } = {}): Promise<Feedback[]> {
    let query = this.db.from("feedback").select();
    if (filter.receiptIds) query = query.in("receipt_id", filter.receiptIds);
    return (check(await query, "list feedback") as Row[]).map(toFeedback);
  }
}
