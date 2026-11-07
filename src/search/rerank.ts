import type { Confidence, SearchResult } from "../types.js";
import { tokenize } from "./tokenize.js";

export interface MatchSignals {
  titleCoverage: number;
  topicCoverage: number;
  bodyCoverage: number;
  matchedTerms: string[];
}

type Rankable = Pick<
  SearchResult,
  "pageTitle" | "pagePath" | "topics" | "content" | "score" | "depthScore"
>;

/** Share of query terms that appear in the title, topics and body of a page. */
export function computeMatchSignals(query: string, row: Rankable): MatchSignals {
  const queryTokens = [...new Set(tokenize(query))];
  if (queryTokens.length === 0) {
    return { titleCoverage: 0, topicCoverage: 0, bodyCoverage: 0, matchedTerms: [] };
  }

  // Whole-token matching (after light stemming), so "lease" does not match "release".
  const title = new Set(tokenize(row.pageTitle));
  const topics = new Set(tokenize(row.topics.join(" ")));
  const body = new Set(tokenize(`${row.pagePath.replace(/[-_/]/g, " ")} ${row.content}`));
  let titleHits = 0;
  let topicHits = 0;
  let bodyHits = 0;
  const matchedTerms: string[] = [];

  for (const token of queryTokens) {
    const inTitle = title.has(token);
    const inTopic = topics.has(token);
    const inBody = body.has(token);
    if (inTitle || inTopic || inBody) matchedTerms.push(token);
    if (inTitle) titleHits += 1;
    if (inTopic) topicHits += 1;
    if (inBody) bodyHits += 1;
  }

  const n = queryTokens.length;
  return {
    titleCoverage: titleHits / n,
    topicCoverage: topicHits / n,
    bodyCoverage: bodyHits / n,
    matchedTerms
  };
}

/** Inverse document frequency of each query term across the candidate set. */
export function buildTokenWeightMap(query: string, rows: Rankable[]): Map<string, number> {
  const docs = rows.map(
    (row) => new Set(tokenize(`${row.pageTitle} ${row.topics.join(" ")} ${row.content}`))
  );
  const total = Math.max(1, docs.length);
  const weights = new Map<string, number>();
  for (const token of new Set(tokenize(query))) {
    const df = docs.filter((doc) => doc.has(token)).length;
    weights.set(token, Math.log((total + 1) / (df + 1)) + 1);
  }
  return weights;
}

/** 0..1: how rare (specific) the matched terms are, relative to the rarest query term. */
export function rareTermScore(matchedTerms: string[], weights: Map<string, number>): number {
  const matched = matchedTerms
    .map((term) => weights.get(term))
    .filter((value): value is number => typeof value === "number");
  if (matched.length === 0) {
    return 0;
  }
  const maxWeight = Math.max(...weights.values(), 1);
  const average = matched.reduce((sum, value) => sum + value, 0) / matched.length;
  return Math.max(0, Math.min(1, average / maxWeight));
}

/**
 * Hybrid rerank: backend score + keyword coverage + term specificity + page depth.
 * Input scores must already be in 0..1. Output `score` is the combined score.
 */
export function rerank<T extends Rankable>(
  query: string,
  rows: T[],
  limit: number,
  rawScale = 1
): Array<T & { rawScore: number; keywordScore: number; matchedTerms: string[]; matchReason: string }> {
  const weights = buildTokenWeightMap(query, rows);
  return rows
    .map((row) => {
      const signals = computeMatchSignals(query, row);
      const keywordScore =
        signals.titleCoverage * 0.45 + signals.topicCoverage * 0.35 + signals.bodyCoverage * 0.2;
      const specificity = rareTermScore(signals.matchedTerms, weights);
      const depth = Math.max(0, Math.min(1, row.depthScore));
      const semantic = Math.min(1, row.score * rawScale);
      const combined = semantic * 0.4 + keywordScore * 0.35 + specificity * 0.15 + depth * 0.1;
      const terms = signals.matchedTerms.slice(0, 5).join(", ") || "none";
      return {
        ...row,
        rawScore: row.score,
        score: Number(combined.toFixed(3)),
        keywordScore: Number(keywordScore.toFixed(3)),
        matchedTerms: signals.matchedTerms.slice(0, 8),
        matchReason: `backend=${semantic.toFixed(2)} keyword=${keywordScore.toFixed(2)} terms=[${terms}]`
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface ScoreThresholds {
  /** Minimum raw backend score for a page to be considered at all. */
  candidateFloor: number;
  /** Minimum combined score for a network match to be offered. */
  confident: number;
  /** Lower bar for the user's own wiki. */
  ownConfident: number;
  /** Multiplier that maps raw backend scores onto a comparable 0..1 range before reranking. */
  rawScale: number;
}

export function confidenceFor(score: number, t: ScoreThresholds): Confidence {
  if (score >= t.confident) return "high";
  if (score >= t.ownConfident) return "medium";
  return "low";
}
