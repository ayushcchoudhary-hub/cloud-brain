import type { EvalResult, SearchResult } from "./types.js";
import { scanPii } from "./wiki/pii.js";

/** Cheap checks on what a pull delivers. These are signals, not a quality judgement. */
export function evaluatePull(synthesis: string, delivered: SearchResult[]): EvalResult {
  const mean =
    delivered.length === 0
      ? 0
      : delivered.reduce((sum, row) => sum + row.score, 0) / delivered.length;
  const pii = scanPii(synthesis, "synthesis");
  return {
    meanMatchScore: Number(mean.toFixed(3)),
    citationCount: delivered.length,
    piiLeakage: { flagged: pii.length > 0, matches: pii.map((f) => f.value) }
  };
}
