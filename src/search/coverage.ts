import type { SearchResult } from "../types.js";

function dedupe(items: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const cleaned = item.trim().replace(/\s+/g, " ");
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    out.push(cleaned);
    if (out.length >= limit) break;
  }
  return out;
}

/** What a set of matches covers, by page title. Used in the offer text. */
export function coverageAngles(results: Pick<SearchResult, "pageTitle">[], limit = 3): string[] {
  return dedupe(
    results.map((row) => row.pageTitle),
    limit
  );
}

export function formatList(items: string[]): string {
  if (items.length === 0) return "related topics";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
