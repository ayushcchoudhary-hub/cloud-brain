import type {
  Contributor,
  Feedback,
  PageHit,
  Payment,
  Quote,
  QuoteStatus,
  WikiPage
} from "../types.js";

export type ContributorPatch = Partial<
  Pick<Contributor, "displayName" | "reputation" | "totalPulls" | "totalEarningsUsdc">
>;

export interface PaymentFilter {
  buyerId?: string;
  contributorId?: string;
  since?: Date;
  limit?: number;
}

/**
 * Everything the service needs from storage. Two implementations:
 * MemoryStore (default, zero setup) and SupabaseStore (optional).
 */
export interface Store {
  readonly kind: "memory" | "supabase";

  upsertContributor(input: { handle: string; displayName: string }): Promise<Contributor>;
  getContributors(ids?: string[]): Promise<Contributor[]>;
  updateContributor(id: string, patch: ContributorPatch): Promise<void>;

  upsertPages(contributorId: string, pages: WikiPage[]): Promise<number>;
  /** Top candidate pages for a query, best first. Scores are 0..1. */
  searchPages(query: string, limit: number): Promise<PageHit[]>;

  saveQuote(quote: Quote): Promise<Quote>;
  getQuote(id: string): Promise<Quote | null>;
  setQuoteStatus(id: string, status: QuoteStatus): Promise<void>;
  countQuotes(): Promise<number>;

  recordPayment(payment: Payment): Promise<Payment>;
  getPayment(receiptId: string): Promise<Payment | null>;
  /** Newest first. */
  listPayments(filter?: PaymentFilter): Promise<Payment[]>;

  recordFeedback(feedback: Feedback): Promise<Feedback>;
  listFeedback(filter?: { receiptIds?: string[] }): Promise<Feedback[]>;
}
