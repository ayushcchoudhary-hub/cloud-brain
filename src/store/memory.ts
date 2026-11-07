import { randomUUID } from "node:crypto";

import { TfIdfIndex } from "../search/tfidf.js";
import type { Contributor, Feedback, PageHit, Payment, Quote, QuoteStatus, WikiPage } from "../types.js";
import type { ContributorPatch, PaymentFilter, Store } from "./types.js";

/** New contributors start mid-scale; feedback moves them up or down. */
const STARTING_REPUTATION = 3;

/** Default backend. Everything lives in process memory and is gone on exit. */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;
  private contributors = new Map<string, Contributor>();
  private pages = new Map<string, Omit<PageHit, "score">>();
  private index = new TfIdfIndex();
  private quotes = new Map<string, Quote>();
  private payments: Payment[] = [];
  private feedback: Feedback[] = [];

  async upsertContributor(input: { handle: string; displayName: string }): Promise<Contributor> {
    const existing = [...this.contributors.values()].find((c) => c.handle === input.handle);
    if (existing) {
      existing.displayName = input.displayName;
      return { ...existing };
    }
    const created: Contributor = {
      id: randomUUID(),
      handle: input.handle,
      displayName: input.displayName,
      reputation: STARTING_REPUTATION,
      totalPulls: 0,
      totalEarningsUsdc: 0
    };
    this.contributors.set(created.id, created);
    return { ...created };
  }

  async getContributors(ids?: string[]): Promise<Contributor[]> {
    const all = [...this.contributors.values()];
    return (ids ? all.filter((c) => ids.includes(c.id)) : all).map((c) => ({ ...c }));
  }

  async updateContributor(id: string, patch: ContributorPatch): Promise<void> {
    const current = this.contributors.get(id);
    if (current) this.contributors.set(id, { ...current, ...patch });
  }

  async upsertPages(contributorId: string, pages: WikiPage[]): Promise<number> {
    for (const page of pages) {
      const existing = [...this.pages.values()].find(
        (p) => p.contributorId === contributorId && p.pagePath === page.pagePath
      );
      const pageId = existing?.pageId ?? randomUUID();
      this.pages.set(pageId, {
        pageId,
        contributorId,
        pageTitle: page.pageTitle,
        pagePath: page.pagePath,
        summary: page.summary,
        topics: page.topics,
        depthScore: page.depthScore,
        sourceCount: page.sourceCount,
        contentHash: page.contentHash,
        content: page.content
      });
      this.index.upsert({ id: pageId, title: page.pageTitle, topics: page.topics, body: page.content });
    }
    return pages.length;
  }

  async searchPages(query: string, limit: number): Promise<PageHit[]> {
    return this.index.query(query, limit).flatMap(({ id, score }) => {
      const page = this.pages.get(id);
      return page ? [{ ...page, score }] : [];
    });
  }

  async saveQuote(quote: Quote): Promise<Quote> {
    this.quotes.set(quote.id, { ...quote });
    return { ...quote };
  }

  async getQuote(id: string): Promise<Quote | null> {
    const quote = this.quotes.get(id);
    return quote ? { ...quote } : null;
  }

  async setQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
    const quote = this.quotes.get(id);
    if (quote) quote.status = status;
  }

  async countQuotes(): Promise<number> {
    return this.quotes.size;
  }

  async recordPayment(payment: Payment): Promise<Payment> {
    this.payments.unshift({ ...payment });
    return { ...payment };
  }

  async getPayment(receiptId: string): Promise<Payment | null> {
    const payment = this.payments.find((p) => p.receiptId === receiptId);
    return payment ? { ...payment } : null;
  }

  async listPayments(filter: PaymentFilter = {}): Promise<Payment[]> {
    const rows = this.payments.filter(
      (p) =>
        (!filter.buyerId || p.buyerId === filter.buyerId) &&
        (!filter.contributorId || p.contributorId === filter.contributorId) &&
        (!filter.since || new Date(p.createdAt) >= filter.since)
    );
    return rows.slice(0, filter.limit ?? rows.length).map((p) => ({ ...p }));
  }

  async recordFeedback(feedback: Feedback): Promise<Feedback> {
    this.feedback.push({ ...feedback });
    return { ...feedback };
  }

  async listFeedback(filter: { receiptIds?: string[] } = {}): Promise<Feedback[]> {
    const ids = filter.receiptIds;
    return this.feedback.filter((f) => !ids || ids.includes(f.receiptId)).map((f) => ({ ...f }));
  }
}
