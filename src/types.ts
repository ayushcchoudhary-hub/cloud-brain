/** A markdown page after parsing. Content is already PII-scrubbed. */
export interface WikiPage {
  pageTitle: string;
  pagePath: string;
  fullPath: string;
  content: string;
  summary: string;
  topics: string[];
  sourceCount: number;
  depthScore: number;
  crossReferenceCount: number;
  lastUpdated: string;
  contentHash: string;
}

export interface Contributor {
  id: string;
  handle: string;
  displayName: string;
  /** 0..5, nudged by buyer feedback. */
  reputation: number;
  totalPulls: number;
  totalEarningsUsdc: number;
}

/** A raw match from a store. `score` is in 0..1 and its scale depends on the backend. */
export interface PageHit {
  pageId: string;
  contributorId: string;
  pageTitle: string;
  pagePath: string;
  summary: string;
  topics: string[];
  depthScore: number;
  sourceCount: number;
  contentHash: string;
  content: string;
  score: number;
}

export type Confidence = "high" | "medium" | "low";

export interface SearchResult extends PageHit {
  contributorHandle: string;
  contributorDisplayName: string;
  contributorReputation: number;
  isOwn: boolean;
  priceUsdc: number;
  /** Raw backend score before reranking. */
  rawScore: number;
  keywordScore: number;
  matchedTerms: string[];
  matchReason: string;
  confidence: Confidence;
}

export type QuoteStatus = "quoted" | "settled" | "expired";

export interface Quote {
  id: string;
  query: string;
  buyerId: string;
  contributorId: string;
  contributorDisplayName: string;
  amountUsdc: number;
  topPagePath: string;
  topPageTitle: string;
  matchScore: number;
  status: QuoteStatus;
  expiresAt: string;
  createdAt: string;
}

/** A simulated payment. Nothing moves on any chain. */
export interface Payment {
  receiptId: string;
  query: string;
  buyerId: string;
  contributorId: string;
  contributorDisplayName: string;
  amountUsdc: number;
  matchedPagePath: string;
  matchedPageTitle: string;
  quoteId?: string;
  createdAt: string;
}

export interface Feedback {
  receiptId: string;
  useful: boolean;
  rating?: number;
  comment?: string;
  contributorId: string;
  buyerId: string;
  createdAt: string;
}

export interface Citation {
  contributor: string;
  pageTitle: string;
  pagePath: string;
  score: number;
}

export interface EvalResult {
  /** Mean reranked score of the delivered pages. Not a human judgement. */
  meanMatchScore: number;
  citationCount: number;
  piiLeakage: { flagged: boolean; matches: string[] };
}

export interface SafetyReport {
  /** Pages dropped because they look like prompt injection. */
  injectionDropped: Array<{ pagePath: string; patterns: string[] }>;
  /** Pages dropped because content no longer matches its published hash. */
  hashMismatchDropped: string[];
}

export interface Receipt {
  receiptId: string;
  amountUsdc: number;
  currency: "USDC";
  simulated: true;
  payee: string;
  createdAt: string;
}

export interface MarketplaceSummary {
  totalPulls: number;
  grossVolumeUsdc: number;
  averageTicketUsdc: number;
  quotesCreated: number;
  feedbackCount: number;
  usefulFeedbackRate: number;
  topContributors: Array<{
    handle: string;
    displayName: string;
    reputation: number;
    totalPulls: number;
    totalEarningsUsdc: number;
  }>;
}
