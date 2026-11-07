export const STOP_WORDS = new Set([
  "a", "an", "or", "the", "and", "for", "with", "from", "that", "this", "into", "your",
  "are", "was", "were", "can", "not", "has", "have", "had", "its", "their", "about",
  "than", "then", "when", "where", "also", "more", "most", "will", "would", "could",
  "should", "what", "which", "who", "why", "how", "does", "use", "using", "best", "way"
]);

/** Very light stemming: plural "ies" -> "y", trailing "s" dropped on longer words. */
export function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 4 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

/** Lowercase, split on non-word characters, drop stop words and very short tokens. */
export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9+]+/g)
    .map((token) => normalizeToken(token.trim()))
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
}

/** Tokens plus adjacent-pair bigrams ("hybrid search" -> "hybrid_search"). */
export function tokensWithBigrams(input: string): string[] {
  const tokens = tokenize(input);
  const out = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    out.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return out;
}
