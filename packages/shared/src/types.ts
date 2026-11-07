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

export interface ContentArtifactRow {
  id: string;
  contributor_id: string;
  page_title: string;
  page_path: string;
  topics: string[];
  source_count: number;
  depth_score: number;
  content_hash: string;
  pii_scrubbed_content: string;
  embedding: number[];
  last_updated: string;
  similarity?: number;
}

export interface SearchResult {
  pageId: string;
  contributorId: string;
  contributorDisplayName?: string;
  contributorReputation?: number;
  isOwnContributor?: boolean;
  priceUsdc?: number;
  contentHash?: string;
  confidenceBand?: "high" | "medium" | "low";
  pageTitle: string;
  pagePath: string;
  topics: string[];
  depthScore: number;
  sourceCount: number;
  similarity: number;
  keywordScore?: number;
  combinedScore?: number;
  matchedTerms?: string[];
  matchReason?: string;
  excerpt: string;
}

export interface PullCitation {
  contributorDisplayName?: string;
  contributorId?: string;
  pageTitle: string;
  pagePath: string;
  similarity: number;
  priceUsdc?: number;
  matchedTerms?: string[];
  matchReason?: string;
}

export interface PullResult {
  query: string;
  synthesis: string;
  citations: PullCitation[];
  retrieved: SearchResult[];
  safety?: {
    promptInjectionFlagged: boolean;
    promptInjectionMatches: string[];
    contentHashVerified?: boolean;
    hashExpected?: string;
    hashActual?: string;
  };
  timeline?: Array<{
    stage: string;
    at: string;
    detail?: string;
  }>;
  paymentReceipt: {
    txHash: string;
    amountUsdc: number;
    mocked: boolean;
    createdAt: string;
    settlementMs?: number;
    quoteId?: string;
  };
}

export interface EvalResult {
  query: string;
  relevanceScore: number;
  citationCoverage: number;
  piiLeakage: {
    flagged: boolean;
    matches: string[];
  };
  overallScore: number;
}

export interface MockPaymentRecord {
  id?: string;
  query: string;
  buyerWallet: string;
  sellerContributorId: string;
  sellerDisplayName: string;
  amountUsdc: number;
  txHash: string;
  matchedPagePath?: string;
  matchedPageTitle?: string;
  createdAt?: string;
  quoteId?: string;
  settlementMs?: number;
  promptInjectionFlagged?: boolean;
  contentHashVerified?: boolean;
  evalRelevanceScore?: number;
  evalCitationCoverage?: number;
  evalOverallScore?: number;
  piiFlagged?: boolean;
}

export interface MockPullQuote {
  id?: string;
  query: string;
  buyerWallet: string;
  contributorId: string;
  contributorDisplayName: string;
  amountUsdc: number;
  topPagePath: string;
  topPageTitle: string;
  matchReason?: string;
  matchScore?: number;
  matchedTerms?: string[];
  status: "quoted" | "approved" | "settled" | "expired";
  autoApprovable: boolean;
  expiresAt: string;
  createdAt?: string;
}

export interface PullFeedbackRecord {
  id?: string;
  txHash: string;
  useful: boolean;
  rating?: number;
  feedbackText?: string;
  query?: string;
  contributorId?: string;
  buyerWallet?: string;
  createdAt?: string;
}

export interface PullHistoryItem {
  payment: MockPaymentRecord;
  quote?: MockPullQuote;
  feedback?: PullFeedbackRecord;
}

export interface MarketplaceContributorSnapshot {
  contributorId: string;
  contributorDisplayName: string;
  walletAddress?: string;
  reputationScore: number;
  totalPulls: number;
  totalEarningsUsdc: number;
}

export interface MarketplaceSummary {
  totalPulls: number;
  grossVolumeUsdc: number;
  averageTicketUsdc: number;
  quotesCreated?: number;
  quoteToPullConversionRate?: number;
  usefulFeedbackRate?: number;
  pullsLast24h?: number;
  averageEvalOverallScore?: number;
  promptInjectionFlagRate?: number;
  hashVerificationPassRate?: number;
  topContributors: MarketplaceContributorSnapshot[];
  recentPayments: MockPaymentRecord[];
}
