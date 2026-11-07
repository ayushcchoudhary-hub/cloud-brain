import { randomUUID } from "node:crypto";

import OpenAI from "openai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  MarketplaceSummary,
  MockPaymentRecord,
  MockPullQuote,
  PullHistoryItem,
  PullFeedbackRecord,
  PullResult,
  SearchResult,
  WikiPage
} from "../../shared/src/types.js";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  SUPABASE_URL: z
    .string()
    .url()
    .refine((value) => {
      try {
        return new URL(value).hostname.endsWith(".supabase.co");
      } catch {
        return false;
      }
    }, "SUPABASE_URL must be your Supabase project URL ending in .supabase.co"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  LOCAL_ONLY: z.coerce.boolean().default(false),
  EMBED_MODEL: z.string().default("text-embedding-3-large"),
  SYNTH_MODEL: z.string().default("gpt-4.1-mini"),
  DEFAULT_MATCH_THRESHOLD: z.coerce.number().default(0.45),
  DEFAULT_QUOTE_TTL_MINUTES: z.coerce.number().default(15),
  DEFAULT_AUTO_APPROVE_MAX_USDC: z.coerce.number().default(3),
  DEFAULT_MAX_PULLS_PER_HOUR: z.coerce.number().default(20),
  CONTRIBUTOR_WALLET: z.string().default("local-dev-wallet"),
  CONTRIBUTOR_DISPLAY_NAME: z.string().default("Local Contributor")
});

function requireEnv() {
  return envSchema.parse(process.env);
}

function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
}

function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (!Number.isFinite(norm) || norm === 0) {
    return vector;
  }
  return vector.map((v) => v / norm);
}

function localEmbed(input: string, dimensions = 3072): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = input.toLowerCase().split(/[^a-z0-9+.-]+/g).filter(Boolean);
  for (const token of tokens) {
    const hash = fnv1a(token);
    const idx = hash % dimensions;
    const sign = (hash & 1) === 0 ? 1 : -1;
    const weight = 1 + ((hash >>> 8) % 7) / 10;
    vector[idx] = (vector[idx] ?? 0) + sign * weight;
  }
  return normalize(vector);
}

function compactContent(content: string, maxChars: number): string {
  return content.replace(/\s+/g, " ").slice(0, maxChars).trim();
}

function vectorToPgString(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

function createMockTxHash(query: string): string {
  const clean = query.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
  return `mock_${clean || "pull"}_${randomUUID().slice(0, 8)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeDummyPriceUsdc(depthScore: number, reputationScore: number): number {
  const base = 2;
  const depthAdj = clamp(depthScore, 0, 1) * 2;
  const repAdj = clamp(reputationScore, 0, 5) / 5;
  return Number(clamp(base + depthAdj + repAdj, 2, 5).toFixed(2));
}

const SEARCH_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "your",
  "are",
  "was",
  "were",
  "can",
  "not",
  "has",
  "have",
  "had",
  "its",
  "their",
  "about",
  "than",
  "then",
  "when",
  "where",
  "also",
  "more",
  "most",
  "will",
  "would",
  "could",
  "should",
  "what",
  "which",
  "who",
  "why",
  "how",
  "a",
  "an",
  "or"
]);

function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9+.-]+/g)
    .map((token) => normalizeToken(token.trim()))
    .filter((token) => token.length >= 3 && !SEARCH_STOP_WORDS.has(token));
}

interface MatchSignals {
  titleCoverage: number;
  topicCoverage: number;
  bodyCoverage: number;
  matchedTerms: string[];
}

function rowSearchText(result: SearchResult): string {
  return [
    result.pageTitle,
    result.pagePath,
    result.topics.join(" "),
    result.excerpt
  ]
    .join(" ")
    .toLowerCase();
}

function computeMatchSignals(query: string, result: SearchResult): MatchSignals {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) {
    return {
      titleCoverage: 0,
      topicCoverage: 0,
      bodyCoverage: 0,
      matchedTerms: []
    };
  }

  const title = result.pageTitle.toLowerCase();
  const topicText = result.topics.join(" ").toLowerCase();
  const body = [result.pagePath, result.excerpt].join(" ").toLowerCase();

  const matchedTerms: string[] = [];
  let titleHits = 0;
  let topicHits = 0;
  let bodyHits = 0;

  for (const token of queryTokens) {
    const inTitle = title.includes(token);
    const inTopic = topicText.includes(token);
    const inBody = body.includes(token);

    if (inTitle || inTopic || inBody) {
      matchedTerms.push(token);
    }
    if (inTitle) {
      titleHits += 1;
    }
    if (inTopic) {
      topicHits += 1;
    }
    if (inBody) {
      bodyHits += 1;
    }
  }

  const denominator = queryTokens.length;
  return {
    titleCoverage: titleHits / denominator,
    topicCoverage: topicHits / denominator,
    bodyCoverage: bodyHits / denominator,
    matchedTerms
  };
}

function makeMatchReason(
  semanticScore: number,
  titleCoverage: number,
  topicCoverage: number,
  bodyCoverage: number,
  matchedTerms: string[]
): string {
  const terms = matchedTerms.slice(0, 5).join(", ") || "no direct keyword overlap";
  return `semantic=${semanticScore.toFixed(2)} title=${titleCoverage.toFixed(
    2
  )} topic=${topicCoverage.toFixed(2)} body=${bodyCoverage.toFixed(2)} matched_terms=[${terms}]`;
}

function buildTokenWeightMap(query: string, rows: SearchResult[]): Map<string, number> {
  const tokens = [...new Set(tokenize(query))];
  const docs = rows.map((row) => rowSearchText(row));
  const totalDocs = Math.max(1, docs.length);
  const map = new Map<string, number>();

  for (const token of tokens) {
    let docFrequency = 0;
    for (const doc of docs) {
      if (doc.includes(token)) {
        docFrequency += 1;
      }
    }
    const idf = Math.log((totalDocs + 1) / (docFrequency + 1)) + 1;
    map.set(token, idf);
  }

  return map;
}

function rareTermScore(matchedTerms: string[], tokenWeights: Map<string, number>): number {
  if (matchedTerms.length === 0 || tokenWeights.size === 0) {
    return 0;
  }

  const weights = matchedTerms
    .map((term) => tokenWeights.get(term))
    .filter((value): value is number => typeof value === "number");

  if (weights.length === 0) {
    return 0;
  }

  const maxWeight = Math.max(...tokenWeights.values(), 1);
  const averageWeight = weights.reduce((sum, value) => sum + value, 0) / weights.length;
  return Math.max(0, Math.min(1, averageWeight / maxWeight));
}

function normalizeSimilarity(similarity: number): number {
  return Math.max(0, Math.min(1, (similarity + 1) / 2));
}

function rerankResults(query: string, rows: SearchResult[], maxResults: number): SearchResult[] {
  const tokenWeights = buildTokenWeightMap(query, rows);
  const rescored = rows.map((row) => {
    const signals = computeMatchSignals(query, row);
    const semanticScore = normalizeSimilarity(row.similarity);
    const keywordScore =
      signals.titleCoverage * 0.45 +
      signals.topicCoverage * 0.35 +
      signals.bodyCoverage * 0.2;
    const specificityScore = rareTermScore(signals.matchedTerms, tokenWeights);
    const depthBoost = Math.max(0, Math.min(1, row.depthScore));
    const combinedScore =
      semanticScore * 0.4 +
      keywordScore * 0.35 +
      specificityScore * 0.15 +
      depthBoost * 0.1;

    return {
      ...row,
      keywordScore: Number(keywordScore.toFixed(3)),
      combinedScore: Number(combinedScore.toFixed(3)),
      matchedTerms: signals.matchedTerms.slice(0, 8),
      matchReason: makeMatchReason(
        semanticScore,
        signals.titleCoverage,
        signals.topicCoverage,
        signals.bodyCoverage,
        signals.matchedTerms
      )
    };
  });

  return rescored
    .sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0))
    .slice(0, maxResults)
    .map((row) => ({
      ...row,
      similarity: row.combinedScore ?? row.similarity
    }));
}

function toBoundedInt(value: number | undefined, fallback: number, min: number, max: number): number {
  const candidate = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, Math.round(candidate)));
}

function mapPaymentRow(row: Record<string, unknown>): MockPaymentRecord {
  return {
    id: String(row.id ?? ""),
    query: String(row.query ?? ""),
    buyerWallet: String(row.buyer_wallet ?? ""),
    sellerContributorId: String(row.seller_contributor_id ?? ""),
    sellerDisplayName: String(row.seller_display_name ?? ""),
    amountUsdc: Number(row.amount_usdc ?? 0),
    txHash: String(row.tx_hash ?? ""),
    matchedPagePath: String(row.matched_page_path ?? "") || undefined,
    matchedPageTitle: String(row.matched_page_title ?? "") || undefined,
    createdAt: String(row.created_at ?? "") || undefined,
    quoteId: String(row.quote_id ?? "") || undefined,
    settlementMs: Number(row.settlement_ms ?? 0) || undefined,
    promptInjectionFlagged:
      typeof row.prompt_injection_flagged === "boolean"
        ? (row.prompt_injection_flagged as boolean)
        : undefined,
    contentHashVerified:
      typeof row.content_hash_verified === "boolean"
        ? (row.content_hash_verified as boolean)
        : undefined,
    evalRelevanceScore: Number(row.eval_relevance_score ?? 0) || undefined,
    evalCitationCoverage: Number(row.eval_citation_coverage ?? 0) || undefined,
    evalOverallScore: Number(row.eval_overall_score ?? 0) || undefined,
    piiFlagged:
      typeof row.pii_flagged === "boolean" ? (row.pii_flagged as boolean) : undefined
  };
}

function isMissingMockPaymentsTableError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table 'public.mock_payments'") ||
    (lower.includes("mock_payments") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("mock_payments"))
  );
}

function isMissingMockQuotesTableError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table 'public.mock_pull_quotes'") ||
    (lower.includes("mock_pull_quotes") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("mock_pull_quotes"))
  );
}

function isMissingFeedbackTableError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes("could not find the table 'public.mock_pull_feedback'") ||
    (lower.includes("mock_pull_feedback") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("mock_pull_feedback"))
  );
}

function isMissingColumnError(message: string | undefined, columnName: string): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  const normalizedColumn = columnName.toLowerCase();
  return (
    lower.includes("column") &&
    lower.includes(normalizedColumn) &&
    (lower.includes("does not exist") || lower.includes("could not find"))
  );
}

function isMissingFunctionError(message: string | undefined, functionName: string): boolean {
  if (!message) {
    return false;
  }
  const lower = message.toLowerCase();
  return (
    lower.includes(functionName.toLowerCase()) &&
    (lower.includes("does not exist") || lower.includes("could not find the function"))
  );
}

function mapQuoteRow(row: Record<string, unknown>): MockPullQuote {
  return {
    id: String(row.id ?? ""),
    query: String(row.query ?? ""),
    buyerWallet: String(row.buyer_wallet ?? ""),
    contributorId: String(row.contributor_id ?? ""),
    contributorDisplayName: String(row.contributor_display_name ?? ""),
    amountUsdc: Number(row.amount_usdc ?? 0),
    topPagePath: String(row.top_page_path ?? ""),
    topPageTitle: String(row.top_page_title ?? ""),
    matchReason: String(row.match_reason ?? "") || undefined,
    matchScore: Number(row.match_score ?? 0) || undefined,
    matchedTerms: Array.isArray(row.matched_terms)
      ? (row.matched_terms as string[])
      : undefined,
    status: (String(row.status ?? "quoted") as MockPullQuote["status"]) ?? "quoted",
    autoApprovable: Boolean(row.auto_approvable ?? false),
    expiresAt: String(row.expires_at ?? ""),
    createdAt: String(row.created_at ?? "") || undefined
  };
}

function mapFeedbackRow(row: Record<string, unknown>): PullFeedbackRecord {
  return {
    id: String(row.id ?? ""),
    txHash: String(row.tx_hash ?? ""),
    useful: Boolean(row.useful),
    rating: Number(row.rating ?? 0) || undefined,
    feedbackText: String(row.feedback_text ?? "") || undefined,
    query: String(row.query ?? "") || undefined,
    contributorId: String(row.contributor_id ?? "") || undefined,
    buyerWallet: String(row.buyer_wallet ?? "") || undefined,
    createdAt: String(row.created_at ?? "") || undefined
  };
}

function scanPromptInjection(content: string): { flagged: boolean; matches: string[] } {
  const patterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "ignore-previous-instructions", pattern: /\bignore\b.{0,40}\b(previous|prior)\b/i },
    { label: "system-prompt-override", pattern: /\b(system prompt|developer message)\b/i },
    { label: "tool-injection", pattern: /\b(call tool|invoke tool|function call)\b/i },
    { label: "policy-bypass", pattern: /\b(bypass|disable)\b.{0,30}\b(safety|guardrail|policy)\b/i }
  ];

  const matches = patterns.filter((entry) => entry.pattern.test(content)).map((entry) => entry.label);
  return {
    flagged: matches.length > 0,
    matches
  };
}

function computeConfidenceBand(row: SearchResult): "high" | "medium" | "low" {
  const score = row.combinedScore ?? row.similarity;
  const reputation = row.contributorReputation ?? 0;
  const depth = row.depthScore ?? 0;
  const blended = score * 0.6 + Math.min(1, reputation / 5) * 0.2 + Math.min(1, depth) * 0.2;
  if (blended >= 0.68) {
    return "high";
  }
  if (blended >= 0.48) {
    return "medium";
  }
  return "low";
}

function simulateSettlementMs(seed: string): number {
  const hash = fnv1a(seed);
  return 120 + (hash % 780);
}

function shiftIso(startIso: string, deltaMs: number): string {
  return new Date(new Date(startIso).getTime() + deltaMs).toISOString();
}

function dedupeNormalized(items: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const cleaned = item.trim().replace(/\s+/g, " ");
    const normalized = cleaned.toLowerCase();
    if (!cleaned || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(cleaned);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

function inferCoverageAngles(pages: SearchResult[], limit = 3): string[] {
  const topicAngles = dedupeNormalized(
    pages
      .slice(0, 8)
      .flatMap((page) => page.topics)
      .filter((topic) => topic.trim().length >= 3),
    limit
  );

  if (topicAngles.length >= limit) {
    return topicAngles.slice(0, limit);
  }

  const titleAngles = dedupeNormalized(
    pages
      .slice(0, 8)
      .map((page) => page.pageTitle)
      .filter((title) => title.trim().length >= 3),
    limit
  );

  return dedupeNormalized([...topicAngles, ...titleAngles], limit);
}

function formatCoverageAngles(angles: string[]): string {
  if (angles.length === 0) {
    return "key strategic and operational angles";
  }
  if (angles.length === 1) {
    return angles[0] ?? "key strategic and operational angles";
  }
  if (angles.length === 2) {
    return `${angles[0]} and ${angles[1]}`;
  }
  return `${angles[0]}, ${angles[1]}, and ${angles[2]}`;
}

export interface CloudBrainService {
  embedText(input: string): Promise<number[]>;
  ensureContributor(): Promise<{ id: string; wallet: string; displayName: string }>;
  upsertPages(pages: WikiPage[]): Promise<number>;
  search(
    query: string,
    maxResults?: number,
    minSimilarity?: number,
    options?: SearchOptions
  ): Promise<SearchResult[]>;
  createMockQuote(
    query: string,
    buyerWallet: string,
    options?: QuoteOptions
  ): Promise<{ quote: MockPullQuote; selected: SearchResult; alternatives: SearchResult[] }>;
  getMockQuoteById(quoteId: string): Promise<MockPullQuote | null>;
  updateMockQuoteStatus(quoteId: string, status: MockPullQuote["status"]): Promise<void>;
  getBuyerUsage(
    buyerWallet: string
  ): Promise<{ monthlySpendUsdc: number; pullsLastHour: number; pullsLast24h: number }>;
  getPullHistory(options?: PullHistoryOptions): Promise<PullHistoryItem[]>;
  verifySearchResultHash(
    result: SearchResult
  ): Promise<{ verified: boolean; expectedHash?: string; actualHash?: string }>;
  scanPullContent(content: string): { flagged: boolean; matches: string[] };
  recordMockPayment(record: MockPaymentRecord): Promise<MockPaymentRecord>;
  recordPullFeedback(feedback: PullFeedbackRecord): Promise<PullFeedbackRecord>;
  getMarketplaceSummary(options?: MarketplaceSummaryOptions): Promise<MarketplaceSummary>;
  pull(query: string, maxResults?: number, options?: PullOptions): Promise<PullResult>;
}

export interface SearchOptions {
  contributorId?: string;
  includeOwn?: boolean;
  maxPriceUsdc?: number;
}

export interface PullOptions {
  contributorId?: string;
  includeOwn?: boolean;
  maxPriceUsdc?: number;
}

export interface QuoteOptions extends SearchOptions {
  maxResults?: number;
  minSimilarity?: number;
  quoteTtlMinutes?: number;
  autoApproveMaxUsdc?: number;
}

export interface MarketplaceSummaryOptions {
  topContributors?: number;
  recentPayments?: number;
}

export interface PullHistoryOptions {
  buyerWallet?: string;
  contributorId?: string;
  limit?: number;
}

export async function createCloudBrainService(): Promise<CloudBrainService> {
  const env = requireEnv();
  const useLocalMode = env.LOCAL_ONLY || !env.OPENAI_API_KEY;

  const openai = useLocalMode
    ? null
    : new OpenAI({
        apiKey: env.OPENAI_API_KEY
      });

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  async function embedText(input: string): Promise<number[]> {
    if (useLocalMode) {
      return localEmbed(input, 3072);
    }

    if (!openai) {
      throw new Error("OpenAI client is not configured.");
    }

    const response = await openai.embeddings.create({
      model: env.EMBED_MODEL,
      input
    });
    const first = response.data[0];
    if (!first) {
      throw new Error("Embedding API returned no vectors.");
    }
    return first.embedding;
  }

  async function ensureContributor(): Promise<{ id: string; wallet: string; displayName: string }> {
    const wallet = env.CONTRIBUTOR_WALLET;
    const displayName = env.CONTRIBUTOR_DISPLAY_NAME;

    const { data: existing, error: fetchError } = await supabase
      .from("contributors")
      .select("id,wallet_address,display_name")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch contributor: ${fetchError.message}`);
    }

    if (existing) {
      return {
        id: existing.id as string,
        wallet: (existing.wallet_address as string) ?? wallet,
        displayName: (existing.display_name as string) ?? displayName
      };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("contributors")
      .insert({
        wallet_address: wallet,
        display_name: displayName,
        reputation_score: 4.0
      })
      .select("id,wallet_address,display_name")
      .single();

    if (insertError || !inserted) {
      throw new Error(`Failed to create contributor: ${insertError?.message ?? "unknown error"}`);
    }

    return {
      id: inserted.id as string,
      wallet: inserted.wallet_address as string,
      displayName: (inserted.display_name as string) ?? displayName
    };
  }

  async function upsertPages(pages: WikiPage[]): Promise<number> {
    const contributor = await ensureContributor();
    const rows: Array<Record<string, unknown>> = [];

    for (const page of pages) {
      const embeddingInput = `${page.pageTitle}\n\n${page.summary}\n\n${page.content}`;
      const embedding = await embedText(embeddingInput);

      rows.push({
        contributor_id: contributor.id,
        page_title: page.pageTitle,
        page_path: page.pagePath,
        topics: page.topics,
        source_count: page.sourceCount,
        depth_score: page.depthScore,
        content_hash: page.contentHash,
        pii_scrubbed_content: page.content,
        embedding: vectorToPgString(embedding),
        last_updated: page.lastUpdated
      });
    }

    const { error } = await supabase
      .from("content_artifacts")
      .upsert(rows, {
        onConflict: "contributor_id,page_path"
      });

    if (error) {
      throw new Error(`Failed to upsert content artifacts: ${error.message}`);
    }

    const aggregateText = pages
      .slice(0, 40)
      .map((page) => {
        return `${page.pageTitle}: ${page.summary}\nTopics: ${page.topics.join(", ")}`;
      })
      .join("\n");
    const aggregateEmbedding = await embedText(aggregateText);

    const topicStats = new Map<string, { totalDepth: number; count: number }>();
    for (const page of pages) {
      for (const topic of page.topics) {
        const existing = topicStats.get(topic) ?? { totalDepth: 0, count: 0 };
        existing.totalDepth += page.depthScore;
        existing.count += 1;
        topicStats.set(topic, existing);
      }
    }

    const sortedTopicStats = [...topicStats.entries()]
      .map(([topic, stats]) => {
        return {
          topic,
          count: stats.count,
          averageDepth: Number((stats.totalDepth / Math.max(1, stats.count)).toFixed(3))
        };
      })
      .sort((a, b) => {
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        if (b.averageDepth !== a.averageDepth) {
          return b.averageDepth - a.averageDepth;
        }
        return a.topic.localeCompare(b.topic);
      });

    const combinedTopics = sortedTopicStats.slice(0, 50).map((topic) => topic.topic);
    const depthPerTopic = sortedTopicStats.reduce<Record<string, number>>((acc, row) => {
      acc[row.topic] = row.averageDepth;
      return acc;
    }, {});
    const depthPerPage = pages.reduce<Record<string, number>>((acc, page) => {
      acc[page.pagePath] = page.depthScore;
      return acc;
    }, {});
    const latestUpdated = pages
      .map((page) => new Date(page.lastUpdated).getTime())
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), 0);

    const { error: indexError } = await supabase.from("knowledge_indexes").upsert(
      {
        contributor_id: contributor.id,
        topics: combinedTopics,
        depth_scores: {
          topics: depthPerTopic,
          pages: depthPerPage
        },
        page_count: pages.length,
        last_updated:
          latestUpdated > 0 ? new Date(latestUpdated).toISOString() : new Date().toISOString(),
        summary: `Knowledge graph index generated from ${pages.length} markdown pages across ${combinedTopics.length} topics`,
        embedding: vectorToPgString(aggregateEmbedding)
      },
      {
        onConflict: "contributor_id"
      }
    );

    if (indexError) {
      throw new Error(`Failed to upsert contributor index: ${indexError.message}`);
    }

    return pages.length;
  }

  async function search(
    query: string,
    maxResults = 6,
    minSimilarity?: number,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const threshold =
      minSimilarity ?? (useLocalMode ? -1 : env.DEFAULT_MATCH_THRESHOLD);
    const embedding = await embedText(query);
    const candidateCount = Math.max(maxResults * 8, 30);
    const rpcArgs = {
      query_embedding: vectorToPgString(embedding),
      match_threshold: threshold,
      match_count: candidateCount
    };
    let data: unknown[] | null = null;

    const v2Response = await supabase.rpc("match_pages_v2", rpcArgs);
    if (v2Response.error) {
      if (isMissingFunctionError(v2Response.error.message, "match_pages_v2")) {
        const legacyResponse = await supabase.rpc("match_pages", rpcArgs);
        if (legacyResponse.error) {
          throw new Error(`Search failed: ${legacyResponse.error.message}`);
        }
        data = legacyResponse.data as unknown[] | null;
      } else {
        throw new Error(`Search failed: ${v2Response.error.message}`);
      }
    } else {
      data = v2Response.data as unknown[] | null;
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const mapped: SearchResult[] = rows.map((row) => {
      const content = String(row.pii_scrubbed_content ?? "");
      return {
        pageId: String(row.id),
        contributorId: String(row.contributor_id),
        contentHash: String(row.content_hash ?? "") || undefined,
        pageTitle: String(row.page_title),
        pagePath: String(row.page_path),
        topics: Array.isArray(row.topics) ? (row.topics as string[]) : [],
        depthScore: Number(row.depth_score ?? 0),
        sourceCount: Number(row.source_count ?? 0),
        similarity: Number(row.similarity ?? 0),
        excerpt: compactContent(content, 400)
      };
    });

    const contributorIds = [...new Set(mapped.map((row) => row.contributorId))];
    if (contributorIds.length > 0) {
      const { data: contributors, error: contributorsError } = await supabase
        .from("contributors")
        .select("id,display_name,reputation_score,wallet_address")
        .in("id", contributorIds);

      if (!contributorsError && contributors) {
        const metadataById = new Map<
          string,
          { displayName?: string; reputationScore: number; walletAddress?: string }
        >();
        for (const contributor of contributors as Array<Record<string, unknown>>) {
          const id = String(contributor.id ?? "");
          if (id) {
            metadataById.set(id, {
              displayName: String(contributor.display_name ?? "") || undefined,
              reputationScore: Number(contributor.reputation_score ?? 0),
              walletAddress: String(contributor.wallet_address ?? "") || undefined
            });
          }
        }

        let ownWallet = env.CONTRIBUTOR_WALLET;
        if (!ownWallet) {
          const ownContributor = await ensureContributor();
          ownWallet = ownContributor.wallet;
        }

        for (const row of mapped) {
          const metadata = metadataById.get(row.contributorId);
          row.contributorDisplayName = metadata?.displayName;
          row.contributorReputation = metadata?.reputationScore ?? 0;
          row.isOwnContributor =
            Boolean(metadata?.walletAddress) && metadata?.walletAddress === ownWallet;
          row.priceUsdc = computeDummyPriceUsdc(
            row.depthScore,
            row.contributorReputation ?? 0
          );
        }
      }
    }

    const filtered = mapped.filter((row) => {
      if (options.contributorId && row.contributorId !== options.contributorId) {
        return false;
      }
      if (options.includeOwn === false && row.isOwnContributor) {
        return false;
      }
      if (
        typeof options.maxPriceUsdc === "number" &&
        typeof row.priceUsdc === "number" &&
        row.priceUsdc > options.maxPriceUsdc
      ) {
        return false;
      }
      return true;
    });

    const ranked = rerankResults(query, filtered, maxResults);
    const withBands = ranked.map((row) => ({
      ...row,
      confidenceBand: computeConfidenceBand(row)
    }));

    // Own-content-first: promote user's own wiki results above network results
    // when both exist, so single-player mode surfaces own research first
    if (options.includeOwn !== false) {
      const own = withBands.filter((r) => r.isOwnContributor);
      const network = withBands.filter((r) => !r.isOwnContributor);
      return [...own, ...network];
    }

    return withBands;
  }

  async function createMockQuote(
    query: string,
    buyerWallet: string,
    options: QuoteOptions = {}
  ): Promise<{ quote: MockPullQuote; selected: SearchResult; alternatives: SearchResult[] }> {
    const candidates = await search(
      query,
      options.maxResults ?? 12,
      options.minSimilarity ?? 0.2,
      options
    );
    if (candidates.length === 0) {
      throw new Error("No purchasable matches found with current filters.");
    }

    const selected =
      candidates.find((candidate) => candidate.contributorId === options.contributorId) ??
      candidates[0];
    if (!selected) {
      throw new Error("Unable to choose a match for quote generation.");
    }

    const quoteTtlMinutes = toBoundedInt(
      options.quoteTtlMinutes,
      env.DEFAULT_QUOTE_TTL_MINUTES,
      1,
      120
    );
    const autoApproveMaxUsdc =
      typeof options.autoApproveMaxUsdc === "number"
        ? options.autoApproveMaxUsdc
        : env.DEFAULT_AUTO_APPROVE_MAX_USDC;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(
      new Date(createdAt).getTime() + quoteTtlMinutes * 60 * 1000
    ).toISOString();

    const fallback: MockPullQuote = {
      id: randomUUID(),
      query,
      buyerWallet,
      contributorId: selected.contributorId,
      contributorDisplayName: selected.contributorDisplayName ?? selected.contributorId,
      amountUsdc: selected.priceUsdc ?? 3,
      topPagePath: selected.pagePath,
      topPageTitle: selected.pageTitle,
      matchReason: selected.matchReason,
      matchScore: selected.similarity,
      matchedTerms: selected.matchedTerms ?? [],
      status: "quoted",
      autoApprovable: (selected.priceUsdc ?? 3) <= autoApproveMaxUsdc,
      expiresAt,
      createdAt
    };

    const { data, error } = await supabase
      .from("mock_pull_quotes")
      .insert({
        query: fallback.query,
        buyer_wallet: fallback.buyerWallet,
        contributor_id: fallback.contributorId,
        contributor_display_name: fallback.contributorDisplayName,
        amount_usdc: fallback.amountUsdc,
        top_page_path: fallback.topPagePath,
        top_page_title: fallback.topPageTitle,
        match_reason: fallback.matchReason ?? null,
        match_score: fallback.matchScore ?? null,
        matched_terms: fallback.matchedTerms ?? [],
        status: fallback.status,
        auto_approvable: fallback.autoApprovable,
        expires_at: fallback.expiresAt
      })
      .select(
        "id,query,buyer_wallet,contributor_id,contributor_display_name,amount_usdc,top_page_path,top_page_title,match_reason,match_score,matched_terms,status,auto_approvable,expires_at,created_at"
      )
      .single();

    const quote =
      !error && data
        ? mapQuoteRow(data as Record<string, unknown>)
        : isMissingMockQuotesTableError(error?.message)
          ? fallback
          : (() => {
              throw new Error(`Failed to persist mock quote: ${error?.message ?? "unknown error"}`);
            })();

    return {
      quote,
      selected,
      alternatives: candidates.filter((candidate) => candidate.pageId !== selected.pageId).slice(0, 5)
    };
  }

  async function getMockQuoteById(quoteId: string): Promise<MockPullQuote | null> {
    const { data, error } = await supabase
      .from("mock_pull_quotes")
      .select(
        "id,query,buyer_wallet,contributor_id,contributor_display_name,amount_usdc,top_page_path,top_page_title,match_reason,match_score,matched_terms,status,auto_approvable,expires_at,created_at"
      )
      .eq("id", quoteId)
      .maybeSingle();

    if (error) {
      if (isMissingMockQuotesTableError(error.message)) {
        return null;
      }
      throw new Error(`Failed to fetch mock quote: ${error.message}`);
    }
    if (!data) {
      return null;
    }
    return mapQuoteRow(data as Record<string, unknown>);
  }

  async function updateMockQuoteStatus(
    quoteId: string,
    status: MockPullQuote["status"]
  ): Promise<void> {
    const { error } = await supabase
      .from("mock_pull_quotes")
      .update({ status })
      .eq("id", quoteId);
    if (error && !isMissingMockQuotesTableError(error.message)) {
      throw new Error(`Failed to update quote status: ${error.message}`);
    }
  }

  async function getBuyerUsage(
    buyerWallet: string
  ): Promise<{ monthlySpendUsdc: number; pullsLastHour: number; pullsLast24h: number }> {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const hourStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: monthlyRows, error: monthlyError } = await supabase
      .from("mock_payments")
      .select("amount_usdc")
      .eq("buyer_wallet", buyerWallet)
      .gte("created_at", monthStart.toISOString());
    if (monthlyError) {
      if (isMissingMockPaymentsTableError(monthlyError.message)) {
        return { monthlySpendUsdc: 0, pullsLastHour: 0, pullsLast24h: 0 };
      }
      throw new Error(`Failed to load buyer monthly usage: ${monthlyError.message}`);
    }

    const { count: hourCount, error: hourError } = await supabase
      .from("mock_payments")
      .select("id", { count: "exact" })
      .eq("buyer_wallet", buyerWallet)
      .gte("created_at", hourStart);
    if (hourError) {
      throw new Error(`Failed to load buyer hourly usage: ${hourError.message}`);
    }

    const { count: dayCount, error: dayError } = await supabase
      .from("mock_payments")
      .select("id", { count: "exact" })
      .eq("buyer_wallet", buyerWallet)
      .gte("created_at", dayStart);
    if (dayError) {
      throw new Error(`Failed to load buyer daily usage: ${dayError.message}`);
    }

    return {
      monthlySpendUsdc: Number(
        (monthlyRows ?? [])
          .reduce((sum, row) => {
            return sum + Number((row as Record<string, unknown>).amount_usdc ?? 0);
          }, 0)
          .toFixed(2)
      ),
      pullsLastHour: hourCount ?? 0,
      pullsLast24h: dayCount ?? 0
    };
  }

  async function getPullHistory(options: PullHistoryOptions = {}): Promise<PullHistoryItem[]> {
    const limit = toBoundedInt(options.limit, 20, 1, 100);
    let query = supabase
      .from("mock_payments")
      .select(
        "id,query,buyer_wallet,seller_contributor_id,seller_display_name,amount_usdc,tx_hash,matched_page_path,matched_page_title,created_at,quote_id,settlement_ms,prompt_injection_flagged,content_hash_verified,eval_relevance_score,eval_citation_coverage,eval_overall_score,pii_flagged"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.buyerWallet) {
      query = query.eq("buyer_wallet", options.buyerWallet);
    }
    if (options.contributorId) {
      query = query.eq("seller_contributor_id", options.contributorId);
    }

    const { data: rows, error } = await query;
    if (error) {
      if (isMissingMockPaymentsTableError(error.message)) {
        return [];
      }
      throw new Error(`Failed to load pull history: ${error.message}`);
    }

    const payments = (rows ?? []).map((row) => mapPaymentRow(row as Record<string, unknown>));
    if (payments.length === 0) {
      return [];
    }

    const quoteIds = [...new Set(payments.map((payment) => payment.quoteId).filter(Boolean))];
    const txHashes = payments.map((payment) => payment.txHash);

    const quotesById = new Map<string, MockPullQuote>();
    if (quoteIds.length > 0) {
      const { data: quoteRows, error: quoteError } = await supabase
        .from("mock_pull_quotes")
        .select(
          "id,query,buyer_wallet,contributor_id,contributor_display_name,amount_usdc,top_page_path,top_page_title,match_reason,match_score,matched_terms,status,auto_approvable,expires_at,created_at"
        )
        .in("id", quoteIds as string[]);
      if (quoteError && !isMissingMockQuotesTableError(quoteError.message)) {
        throw new Error(`Failed to load quote history: ${quoteError.message}`);
      }
      for (const row of quoteRows ?? []) {
        const quote = mapQuoteRow(row as Record<string, unknown>);
        if (quote.id) {
          quotesById.set(quote.id, quote);
        }
      }
    }

    const feedbackByTx = new Map<string, PullFeedbackRecord>();
    if (txHashes.length > 0) {
      const { data: feedbackRows, error: feedbackError } = await supabase
        .from("mock_pull_feedback")
        .select("id,tx_hash,useful,rating,feedback_text,query,contributor_id,buyer_wallet,created_at")
        .in("tx_hash", txHashes);
      if (feedbackError && !isMissingFeedbackTableError(feedbackError.message)) {
        throw new Error(`Failed to load feedback history: ${feedbackError.message}`);
      }
      for (const row of feedbackRows ?? []) {
        const feedback = mapFeedbackRow(row as Record<string, unknown>);
        feedbackByTx.set(feedback.txHash, feedback);
      }
    }

    return payments.map((payment) => ({
      payment,
      quote: payment.quoteId ? quotesById.get(payment.quoteId) : undefined,
      feedback: feedbackByTx.get(payment.txHash)
    }));
  }

  async function verifySearchResultHash(
    result: SearchResult
  ): Promise<{ verified: boolean; expectedHash?: string; actualHash?: string }> {
    const expectedHash = result.contentHash;
    const { data, error } = await supabase
      .from("content_artifacts")
      .select("content_hash")
      .eq("id", result.pageId)
      .maybeSingle();
    if (error) {
      return {
        verified: false,
        expectedHash
      };
    }

    const actualHash = String((data as Record<string, unknown> | null)?.content_hash ?? "") || undefined;
    if (!expectedHash || !actualHash) {
      return {
        verified: false,
        expectedHash,
        actualHash
      };
    }
    return {
      verified: expectedHash === actualHash,
      expectedHash,
      actualHash
    };
  }

  function scanPullContent(content: string): { flagged: boolean; matches: string[] } {
    return scanPromptInjection(content);
  }

  async function recordMockPayment(record: MockPaymentRecord): Promise<MockPaymentRecord> {
    const txHash = record.txHash || createMockTxHash(record.query);
    const enrichedInsert = await supabase
      .from("mock_payments")
      .insert({
        query: record.query,
        buyer_wallet: record.buyerWallet,
        seller_contributor_id: record.sellerContributorId,
        seller_display_name: record.sellerDisplayName,
        amount_usdc: record.amountUsdc,
        tx_hash: txHash,
        matched_page_path: record.matchedPagePath ?? null,
        matched_page_title: record.matchedPageTitle ?? null,
        quote_id: record.quoteId ?? null,
        settlement_ms: record.settlementMs ?? null,
        prompt_injection_flagged:
          typeof record.promptInjectionFlagged === "boolean"
            ? record.promptInjectionFlagged
            : null,
        content_hash_verified:
          typeof record.contentHashVerified === "boolean"
            ? record.contentHashVerified
            : null,
        eval_relevance_score: record.evalRelevanceScore ?? null,
        eval_citation_coverage: record.evalCitationCoverage ?? null,
        eval_overall_score: record.evalOverallScore ?? null,
        pii_flagged: typeof record.piiFlagged === "boolean" ? record.piiFlagged : null
      })
      .select(
        "id,query,buyer_wallet,seller_contributor_id,seller_display_name,amount_usdc,tx_hash,matched_page_path,matched_page_title,created_at,quote_id,settlement_ms,prompt_injection_flagged,content_hash_verified,eval_relevance_score,eval_citation_coverage,eval_overall_score,pii_flagged"
      )
      .single();

    let inserted = enrichedInsert.data as Record<string, unknown> | null;
    const insertError = enrichedInsert.error;
    if (
      insertError &&
      !isMissingMockPaymentsTableError(insertError.message) &&
      !isMissingColumnError(insertError.message, "quote_id") &&
      !isMissingColumnError(insertError.message, "settlement_ms") &&
      !isMissingColumnError(insertError.message, "prompt_injection_flagged") &&
      !isMissingColumnError(insertError.message, "content_hash_verified") &&
      !isMissingColumnError(insertError.message, "eval_relevance_score")
    ) {
      throw new Error(`Failed to record mock payment: ${insertError.message}`);
    }

    if (
      insertError &&
      (isMissingColumnError(insertError.message, "quote_id") ||
        isMissingColumnError(insertError.message, "settlement_ms") ||
        isMissingColumnError(insertError.message, "prompt_injection_flagged") ||
        isMissingColumnError(insertError.message, "content_hash_verified") ||
        isMissingColumnError(insertError.message, "eval_relevance_score"))
    ) {
      const legacyInsert = await supabase
        .from("mock_payments")
        .insert({
          query: record.query,
          buyer_wallet: record.buyerWallet,
          seller_contributor_id: record.sellerContributorId,
          seller_display_name: record.sellerDisplayName,
          amount_usdc: record.amountUsdc,
          tx_hash: txHash,
          matched_page_path: record.matchedPagePath ?? null,
          matched_page_title: record.matchedPageTitle ?? null
        })
        .select(
          "id,query,buyer_wallet,seller_contributor_id,seller_display_name,amount_usdc,tx_hash,matched_page_path,matched_page_title,created_at"
        )
        .single();
      if (legacyInsert.error && !isMissingMockPaymentsTableError(legacyInsert.error.message)) {
        throw new Error(`Failed to record mock payment: ${legacyInsert.error.message}`);
      }
      inserted = legacyInsert.data as Record<string, unknown> | null;
    }

    const { data: contributor, error: contributorError } = await supabase
      .from("contributors")
      .select("total_pulls,total_earnings_usdc")
      .eq("id", record.sellerContributorId)
      .single();

    if (contributorError || !contributor) {
      throw new Error(
        `Mock payment recorded but contributor stats update failed: ${
          contributorError?.message ?? "missing contributor row"
        }`
      );
    }

    const currentPulls = Number((contributor as Record<string, unknown>).total_pulls ?? 0);
    const currentEarnings = Number(
      (contributor as Record<string, unknown>).total_earnings_usdc ?? 0
    );

    const { error: updateError } = await supabase
      .from("contributors")
      .update({
        total_pulls: currentPulls + 1,
        total_earnings_usdc: Number((currentEarnings + record.amountUsdc).toFixed(2))
      })
      .eq("id", record.sellerContributorId);

    if (updateError) {
      throw new Error(
        `Mock payment recorded but contributor stats update failed: ${updateError.message}`
      );
    }

    if (inserted) {
      return mapPaymentRow(inserted);
    }

    return {
      id: undefined,
      query: record.query,
      buyerWallet: record.buyerWallet,
      sellerContributorId: record.sellerContributorId,
      sellerDisplayName: record.sellerDisplayName,
      amountUsdc: record.amountUsdc,
      txHash,
      matchedPagePath: record.matchedPagePath,
      matchedPageTitle: record.matchedPageTitle,
      createdAt: new Date().toISOString(),
      quoteId: record.quoteId,
      settlementMs: record.settlementMs
    };
  }

  async function recordPullFeedback(feedback: PullFeedbackRecord): Promise<PullFeedbackRecord> {
    const normalizedRating =
      typeof feedback.rating === "number"
        ? Math.max(1, Math.min(5, Math.round(feedback.rating)))
        : undefined;

    const { data, error } = await supabase
      .from("mock_pull_feedback")
      .insert({
        tx_hash: feedback.txHash,
        useful: feedback.useful,
        rating: normalizedRating ?? null,
        feedback_text: feedback.feedbackText ?? null,
        query: feedback.query ?? null,
        contributor_id: feedback.contributorId ?? null,
        buyer_wallet: feedback.buyerWallet ?? null
      })
      .select("id,tx_hash,useful,rating,feedback_text,query,contributor_id,buyer_wallet,created_at")
      .single();

    const updateContributorReputation = async (contributorId: string | undefined) => {
      if (!contributorId) {
        return;
      }
      const { data: contributor, error: contributorError } = await supabase
        .from("contributors")
        .select("reputation_score")
        .eq("id", contributorId)
        .maybeSingle();
      if (contributorError || !contributor) {
        return;
      }
      const currentReputation = Number(
        (contributor as Record<string, unknown>).reputation_score ?? 0
      );
      const ratingAdjustment =
        typeof normalizedRating === "number" ? (normalizedRating - 3) * 0.02 : 0;
      const usefulAdjustment = feedback.useful ? 0.05 : -0.08;
      const updatedReputation = Math.max(
        0,
        Math.min(5, Number((currentReputation + usefulAdjustment + ratingAdjustment).toFixed(3)))
      );
      await supabase
        .from("contributors")
        .update({ reputation_score: updatedReputation })
        .eq("id", contributorId);
    };

    const resolveContributorIdFromPayment = async (): Promise<string | undefined> => {
      if (feedback.contributorId) {
        return feedback.contributorId;
      }
      const { data: paymentRow, error: paymentError } = await supabase
        .from("mock_payments")
        .select("seller_contributor_id")
        .eq("tx_hash", feedback.txHash)
        .maybeSingle();
      if (paymentError || !paymentRow) {
        return undefined;
      }
      return (
        String((paymentRow as Record<string, unknown>).seller_contributor_id ?? "") || undefined
      );
    };

    if (error) {
      if (isMissingFeedbackTableError(error.message)) {
        const resolvedContributorId = await resolveContributorIdFromPayment();
        await updateContributorReputation(resolvedContributorId);
        return {
          ...feedback,
          contributorId: feedback.contributorId ?? resolvedContributorId,
          rating: normalizedRating,
          createdAt: new Date().toISOString()
        };
      }
      throw new Error(`Failed to record pull feedback: ${error.message}`);
    }

    const persisted = mapFeedbackRow(data as Record<string, unknown>);
    await updateContributorReputation(persisted.contributorId);
    return persisted;
  }

  async function getMarketplaceSummary(
    options: MarketplaceSummaryOptions = {}
  ): Promise<MarketplaceSummary> {
    const topContributorsLimit = toBoundedInt(options.topContributors, 5, 1, 20);
    const recentPaymentsLimit = toBoundedInt(options.recentPayments, 10, 1, 50);
    let hasMockPaymentsTable = true;
    let hasMockQuotesTable = true;
    let hasFeedbackTable = true;

    const { data: recentRows, error: recentError } = await supabase
      .from("mock_payments")
      .select(
        "id,query,buyer_wallet,seller_contributor_id,seller_display_name,amount_usdc,tx_hash,matched_page_path,matched_page_title,created_at"
      )
      .order("created_at", { ascending: false })
      .limit(recentPaymentsLimit);
    if (recentError && !isMissingMockPaymentsTableError(recentError.message)) {
      throw new Error(`Failed to load recent mock payments: ${recentError.message}`);
    }
    if (recentError && isMissingMockPaymentsTableError(recentError.message)) {
      hasMockPaymentsTable = false;
    }

    let allPaymentRows: Array<Record<string, unknown>> = [];
    let paymentCount = 0;
    const enrichedPaymentsQuery = await supabase
      .from("mock_payments")
      .select(
        "amount_usdc,eval_overall_score,prompt_injection_flagged,content_hash_verified",
        { count: "exact" }
      );
    if (enrichedPaymentsQuery.error) {
      if (isMissingMockPaymentsTableError(enrichedPaymentsQuery.error.message)) {
        hasMockPaymentsTable = false;
      } else if (
        isMissingColumnError(enrichedPaymentsQuery.error.message, "eval_overall_score") ||
        isMissingColumnError(enrichedPaymentsQuery.error.message, "prompt_injection_flagged") ||
        isMissingColumnError(enrichedPaymentsQuery.error.message, "content_hash_verified")
      ) {
        const legacyPaymentsQuery = await supabase
          .from("mock_payments")
          .select("amount_usdc", { count: "exact" });
        if (legacyPaymentsQuery.error && !isMissingMockPaymentsTableError(legacyPaymentsQuery.error.message)) {
          throw new Error(`Failed to load marketplace totals: ${legacyPaymentsQuery.error.message}`);
        }
        if (legacyPaymentsQuery.error && isMissingMockPaymentsTableError(legacyPaymentsQuery.error.message)) {
          hasMockPaymentsTable = false;
        } else {
          allPaymentRows = (legacyPaymentsQuery.data as Array<Record<string, unknown>>) ?? [];
          paymentCount = legacyPaymentsQuery.count ?? allPaymentRows.length;
        }
      } else {
        throw new Error(`Failed to load marketplace totals: ${enrichedPaymentsQuery.error.message}`);
      }
    } else {
      allPaymentRows = (enrichedPaymentsQuery.data as Array<Record<string, unknown>>) ?? [];
      paymentCount = enrichedPaymentsQuery.count ?? allPaymentRows.length;
    }

    const { count: quotesCount, error: quotesError } = await supabase
      .from("mock_pull_quotes")
      .select("id", { count: "exact" });
    if (quotesError && !isMissingMockQuotesTableError(quotesError.message)) {
      throw new Error(`Failed to load marketplace quote totals: ${quotesError.message}`);
    }
    if (quotesError && isMissingMockQuotesTableError(quotesError.message)) {
      hasMockQuotesTable = false;
    }

    const { data: feedbackRows, error: feedbackError } = await supabase
      .from("mock_pull_feedback")
      .select("useful");
    if (feedbackError && !isMissingFeedbackTableError(feedbackError.message)) {
      throw new Error(`Failed to load pull feedback metrics: ${feedbackError.message}`);
    }
    if (feedbackError && isMissingFeedbackTableError(feedbackError.message)) {
      hasFeedbackTable = false;
    }

    const { data: topRows, error: topError } = await supabase
      .from("contributors")
      .select("id,display_name,wallet_address,reputation_score,total_pulls,total_earnings_usdc")
      .order("total_earnings_usdc", { ascending: false })
      .limit(topContributorsLimit);
    if (topError) {
      throw new Error(`Failed to load contributor earnings leaderboard: ${topError.message}`);
    }

    let totalPulls = 0;
    let grossVolumeUsdc = 0;
    let averageTicketUsdc = 0;
    let pullsLast24h = 0;
    let averageEvalOverallScore = 0;
    let promptInjectionFlagRate = 0;
    let hashVerificationPassRate = 0;

    if (hasMockPaymentsTable) {
      const allAmounts = (allPaymentRows ?? [])
        .map((row) => Number((row as Record<string, unknown>).amount_usdc ?? 0))
        .filter((value) => Number.isFinite(value) && value >= 0);
      totalPulls = paymentCount || allAmounts.length;
      grossVolumeUsdc = Number(allAmounts.reduce((sum, value) => sum + value, 0).toFixed(2));
      averageTicketUsdc =
        allAmounts.length > 0
          ? Number((grossVolumeUsdc / allAmounts.length).toFixed(2))
          : 0;

      const evalScores = allPaymentRows
        .map((row) => Number((row as Record<string, unknown>).eval_overall_score ?? 0))
        .filter((value) => Number.isFinite(value) && value > 0);
      averageEvalOverallScore =
        evalScores.length > 0
          ? Number(
              (
                evalScores.reduce((sum, value) => sum + value, 0) / evalScores.length
              ).toFixed(3)
            )
          : 0;

      const injectionFlags = allPaymentRows.filter((row) => {
        return (row as Record<string, unknown>).prompt_injection_flagged === true;
      }).length;
      promptInjectionFlagRate =
        allPaymentRows.length > 0
          ? Number((injectionFlags / allPaymentRows.length).toFixed(3))
          : 0;

      const hashStatuses = allPaymentRows
        .map((row) => (row as Record<string, unknown>).content_hash_verified)
        .filter((value) => typeof value === "boolean") as boolean[];
      const hashPasses = hashStatuses.filter(Boolean).length;
      hashVerificationPassRate =
        hashStatuses.length > 0
          ? Number((hashPasses / hashStatuses.length).toFixed(3))
          : 0;

      const { count: pullsLast24hCount, error: pullsLast24hError } = await supabase
        .from("mock_payments")
        .select("id", { count: "exact" })
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      if (pullsLast24hError) {
        throw new Error(`Failed to load last-24h pull metric: ${pullsLast24hError.message}`);
      }
      pullsLast24h = pullsLast24hCount ?? 0;
    } else {
      const { data: contributorTotals, error: contributorTotalsError } = await supabase
        .from("contributors")
        .select("total_pulls,total_earnings_usdc");
      if (contributorTotalsError) {
        throw new Error(
          `Failed to load contributor fallback totals: ${contributorTotalsError.message}`
        );
      }
      totalPulls = (contributorTotals ?? []).reduce((sum, row) => {
        return sum + Number((row as Record<string, unknown>).total_pulls ?? 0);
      }, 0);
      grossVolumeUsdc = Number(
        (contributorTotals ?? [])
          .reduce((sum, row) => {
            return sum + Number((row as Record<string, unknown>).total_earnings_usdc ?? 0);
          }, 0)
          .toFixed(2)
      );
      averageTicketUsdc =
        totalPulls > 0 ? Number((grossVolumeUsdc / totalPulls).toFixed(2)) : 0;
    }

    const quotesCreated = hasMockQuotesTable ? quotesCount ?? 0 : 0;
    const quoteToPullConversionRate =
      quotesCreated > 0 ? Number((totalPulls / quotesCreated).toFixed(3)) : 0;
    const usefulFeedbackRate = hasFeedbackTable
      ? (() => {
          const rows = feedbackRows ?? [];
          if (rows.length === 0) {
            return 0;
          }
          const useful = rows.reduce((sum, row) => {
            return sum + (Boolean((row as Record<string, unknown>).useful) ? 1 : 0);
          }, 0);
          return Number((useful / rows.length).toFixed(3));
        })()
      : 0;

    return {
      totalPulls,
      grossVolumeUsdc,
      averageTicketUsdc,
      quotesCreated,
      quoteToPullConversionRate,
      usefulFeedbackRate,
      pullsLast24h,
      averageEvalOverallScore,
      promptInjectionFlagRate,
      hashVerificationPassRate,
      topContributors: (topRows ?? []).map((row) => {
        const source = row as Record<string, unknown>;
        return {
          contributorId: String(source.id ?? ""),
          contributorDisplayName: String(source.display_name ?? "Unknown Contributor"),
          walletAddress: String(source.wallet_address ?? "") || undefined,
          reputationScore: Number(source.reputation_score ?? 0),
          totalPulls: Number(source.total_pulls ?? 0),
          totalEarningsUsdc: Number(source.total_earnings_usdc ?? 0)
        };
      }),
      recentPayments: hasMockPaymentsTable
        ? (recentRows ?? []).map((row) => mapPaymentRow(row as Record<string, unknown>))
        : []
    };
  }

  async function synthesize(query: string, pages: SearchResult[]): Promise<string> {
    if (pages.length === 0) {
      return "";
    }

    const coverageAngles = inferCoverageAngles(pages, 3);
    const coverageLine = `Based on compiled research from the network, this research covers: ${formatCoverageAngles(
      coverageAngles
    )}.`;

    if (useLocalMode) {
      const bullets = pages.slice(0, 4).map((page, idx) => {
        return `${idx + 1}. ${page.pageTitle} [${page.pagePath}] (sim ${page.similarity.toFixed(
          2
        )}): ${compactContent(page.excerpt, 180)}`;
      });

      return `${coverageLine}\n\nCompiled findings for "${query}":\n${bullets.join("\n")}`;
    }

    if (!openai) {
      throw new Error("OpenAI client is not configured.");
    }

    const context = pages
      .map((page, index) => {
        return `Source ${index + 1}: ${page.pageTitle} (${page.pagePath})\nSimilarity: ${page.similarity.toFixed(
          3
        )}\nExcerpt: ${page.excerpt}`;
      })
      .join("\n\n");

    const completion = await openai.responses.create({
      model: env.SYNTH_MODEL,
      input: [
        {
          role: "system",
          content:
            "You synthesize compiled network research for a user query. Stay grounded in the provided sources, prioritize concrete details, and avoid adding facts not present in sources."
        },
        {
          role: "user",
          content: `Query: ${query}\n\nSources:\n${context}\n\nWrite a synthesis that reads like high-quality research support for an ongoing analysis.\nRequirements:\n- Start with exactly one line: "${coverageLine}"\n- Then provide specific findings and implications grounded in the sources.\n- Include concrete details (numbers, constraints, tradeoffs, implementation specifics) whenever present in sources.\n- Include a brief caveat/uncertainty sentence if sources are incomplete or disagree.\n- Use subtle attribution language (compiled research from the network). Do not mention contributors, pricing, or marketplace mechanics.\n- Include source tags like [S1], [S2] inline for claims.\n- Do not use wrappers or delimiters like [EXTERNAL RESEARCH].`
        }
      ]
    });

    const text = completion.output_text?.trim();
    if (!text) {
      return `${coverageLine}\n\nCompiled research returned no usable synthesis for "${query}".`;
    }

    return text;
  }

  async function pull(
    query: string,
    maxResults = 6,
    options: PullOptions = {}
  ): Promise<PullResult> {
    const retrieved = await search(query, maxResults, undefined, options);
    const synthesis = await synthesize(query, retrieved);
    const priced = retrieved
      .map((row) => row.priceUsdc)
      .filter((value): value is number => typeof value === "number");
    const amountUsdc =
      priced.length > 0
        ? Number((priced.reduce((sum, value) => sum + value, 0) / priced.length).toFixed(2))
        : 3;

    return {
      query,
      synthesis,
      citations: retrieved.map((result) => ({
        contributorDisplayName: result.contributorDisplayName,
        contributorId: result.contributorId,
        pageTitle: result.pageTitle,
        pagePath: result.pagePath,
        similarity: result.similarity,
        priceUsdc: result.priceUsdc,
        matchedTerms: result.matchedTerms,
        matchReason: result.matchReason
      })),
      retrieved,
      paymentReceipt: {
        txHash: createMockTxHash(query),
        amountUsdc,
        mocked: true,
        createdAt: new Date().toISOString()
      }
    };
  }

  return {
    embedText,
    ensureContributor,
    upsertPages,
    search,
    createMockQuote,
    getMockQuoteById,
    updateMockQuoteStatus,
    getBuyerUsage,
    getPullHistory,
    verifySearchResultHash,
    scanPullContent,
    recordMockPayment,
    recordPullFeedback,
    getMarketplaceSummary,
    pull
  };
}

export function createTestOnlySupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}
