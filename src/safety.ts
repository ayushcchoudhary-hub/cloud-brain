import { sha256 } from "./wiki/parse.js";

const INJECTION_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "ignore-previous-instructions", pattern: /\b(ignore|disregard|forget)\b.{0,40}\b(previous|prior|above|earlier)\b.{0,20}\b(instructions?|prompts?|rules?)\b/i },
  { label: "system-prompt-override", pattern: /\b(system prompt|developer message|you are now)\b/i },
  { label: "tool-injection", pattern: /\b(call|invoke) (the |this )?tool\b/i },
  { label: "policy-bypass", pattern: /\b(bypass|disable|override)\b.{0,30}\b(safety|guardrails?|polic(y|ies))\b/i }
];

/** Look for text that tries to instruct the reading model. Pulled pages are data, not instructions. */
export function scanPromptInjection(content: string): { flagged: boolean; matches: string[] } {
  const matches = INJECTION_PATTERNS.filter(({ pattern }) => pattern.test(content)).map(
    ({ label }) => label
  );
  return { flagged: matches.length > 0, matches };
}

/** True when the content served now is byte-identical to what was published. */
export function verifyContentHash(content: string, publishedHash: string): boolean {
  return Boolean(publishedHash) && sha256(content) === publishedHash;
}
