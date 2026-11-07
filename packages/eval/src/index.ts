import type { EvalResult, PullResult } from "../../shared/src/types.js";

const PII_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\+?\d[\d\s().-]{8,}\d/g,
  /\b\d{3}-\d{2}-\d{4}\b/g
];

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function evaluatePull(query: string, pull: PullResult): EvalResult {
  const citationCoverage = pull.citations.length > 0 ? 1 : 0;
  const relevanceScore =
    pull.retrieved.length === 0
      ? 0
      : pull.retrieved.reduce((acc, row) => acc + row.similarity, 0) / pull.retrieved.length;

  const piiMatches = new Set<string>();
  for (const pattern of PII_PATTERNS) {
    const matches = pull.synthesis.match(pattern) ?? [];
    for (const match of matches) {
      piiMatches.add(match);
    }
  }

  const overallScore = clamp(relevanceScore * 0.7 + citationCoverage * 0.3);

  return {
    query,
    relevanceScore: Number(relevanceScore.toFixed(3)),
    citationCoverage: Number(citationCoverage.toFixed(3)),
    piiLeakage: {
      flagged: piiMatches.size > 0,
      matches: [...piiMatches]
    },
    overallScore: Number(overallScore.toFixed(3))
  };
}

