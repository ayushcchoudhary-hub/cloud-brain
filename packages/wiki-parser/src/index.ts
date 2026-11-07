import { createHash } from "node:crypto";
import { stat, readFile, access } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";
import OpenAI from "openai";

import type { WikiPage } from "../../shared/src/types.js";

export interface ParseWikiOptions {
  wikiRoot: string;
  /** Glob pattern override. Default: auto-detected based on folder structure. */
  globPattern?: string;
}

export interface PiiFinding {
  type: string;
  value: string;
  file: string;
  line: number;
  reason?: string;
}

export interface PiiReport {
  findings: PiiFinding[];
  totalFiles: number;
  filesWithPii: number;
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "your",
  "are",
  "was",
  "were",
  "can",
  "not",
  "has",
  "have",
  "had",
  "its",
  "their",
  "about",
  "than",
  "then",
  "when",
  "where",
  "also",
  "more",
  "most",
  "will",
  "would",
  "could",
  "should",
  "what",
  "which",
  "who",
  "why",
  "how"
]);

function makeSummary(markdown: string): string {
  const quoteMatch = markdown.match(/^>\s+(.+)$/m);
  if (quoteMatch?.[1]) {
    return quoteMatch[1].trim();
  }

  const text = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]+`{1,3}/g, "")
    .replace(/[>*_]/g, "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .find((line) => line.length > 40);

  if (!text) {
    return "No summary available.";
  }

  return text.slice(0, 220);
}

function extractTopics(markdown: string): string[] {
  const headingTerms = [...markdown.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .flatMap((match) => (match[1] ?? "").toLowerCase().split(/[^a-z0-9+.-]+/g))
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term));

  const bodyTerms = markdown
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, "")
    .split(/[^a-z0-9+.-]+/g)
    .filter((term) => term.length >= 5 && !STOP_WORDS.has(term));

  const counts = new Map<string, number>();
  for (const term of [...headingTerms, ...bodyTerms]) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Resolve Obsidian-style [[wikilinks]] into standard markdown cross-references.
 * [[page]] -> [page](page.md)
 * [[page|alias]] -> [alias](page.md)
 */
function resolveWikilinks(markdown: string): string {
  return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias?: string) => {
    const display = alias?.trim() || target.trim();
    const href = target.trim().replace(/\s+/g, "-") + ".md";
    return `[${display}](${href})`;
  });
}

function computeDepthScore(markdown: string): {
  depthScore: number;
  sourceCount: number;
  crossReferenceCount: number;
} {
  const charCount = markdown.length;
  const headingCount = (markdown.match(/^#{2,6}\s+/gm) ?? []).length;
  const links = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)];

  const sourceLinks = links.filter((match) => {
    const target = match[1] ?? "";
    return target.startsWith("http://") || target.startsWith("https://");
  });

  const crossRefs = links.filter((match) => {
    const target = match[1] ?? "";
    return target.startsWith("../") || target.startsWith("pages/") || target.endsWith(".md");
  });

  const lengthScore = clamp(charCount / 7000);
  const structureScore = clamp(headingCount / 18);
  const sourceScore = clamp(sourceLinks.length / 8);
  const crossRefScore = clamp(crossRefs.length / 14);

  const depthScore = clamp(
    lengthScore * 0.45 +
      structureScore * 0.2 +
      sourceScore * 0.2 +
      crossRefScore * 0.15
  );

  return {
    depthScore: Number(depthScore.toFixed(3)),
    sourceCount: sourceLinks.length,
    crossReferenceCount: crossRefs.length
  };
}

export function stripPiiForPoC(markdown: string): string {
  return markdown
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[REDACTED_PHONE]");
}

// Date pattern used to filter out false positives from phone regex
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const PII_PATTERNS: Array<{ type: string; regex: RegExp; filter?: (match: string) => boolean }> = [
  { type: "email", regex: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  {
    type: "phone",
    // Require at least one space, paren, or leading + to distinguish from dates/IDs
    regex: /(?:\+\d[\d\s().-]{8,}\d|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})/g,
    filter: (match) => !DATE_PATTERN.test(match.trim())
  },
  { type: "ssn", regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { type: "api_key", regex: /\b(?:sk-|pk_|api[_-]?key[=:]\s*)[A-Za-z0-9_-]{20,}\b/gi },
  { type: "ip_address", regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g },
  { type: "possible_name", regex: /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g }
];

/** Scan markdown content for PII without modifying it. Returns findings with line numbers. */
export function scanPii(markdown: string, filePath: string): PiiFinding[] {
  const lines = markdown.split("\n");
  const findings: PiiFinding[] = [];

  // Skip code blocks
  let inCodeBlock = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    for (const { type, regex, filter } of PII_PATTERNS) {
      // Reset regex state for each line
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        if (filter && !filter(match[0])) continue;
        findings.push({
          type,
          value: match[0],
          file: filePath,
          line: i + 1
        });
      }
    }
  }

  return findings;
}

/** Scan all pages and produce a PII report. */
export function scanPiiReport(pages: Array<{ content: string; pagePath: string }>): PiiReport {
  const allFindings: PiiFinding[] = [];
  const filesWithPii = new Set<string>();

  for (const page of pages) {
    const findings = scanPii(page.content, page.pagePath);
    if (findings.length > 0) {
      filesWithPii.add(page.pagePath);
      allFindings.push(...findings);
    }
  }

  return {
    findings: allFindings,
    totalFiles: pages.length,
    filesWithPii: filesWithPii.size
  };
}

const LLM_PII_PROMPT = `You are a PII detection system. Analyze the following markdown content and identify any personally identifiable information (PII) that should be reviewed before publishing to a public knowledge network.

For each PII item found, return a JSON object with:
- "type": one of "email", "phone", "name", "address", "financial", "api_key", "ssn", "other"
- "value": the exact text found
- "file": the filename (provided in the header)
- "line": approximate line number
- "risk": "high" (definitely PII), "medium" (likely PII), or "low" (possibly PII, e.g. public figures)
- "reason": brief explanation of why this is PII

Important context:
- Public figures (Karpathy, Vitalik, etc.) mentioned in a research context are LOW risk — don't flag them unless in a personal/private context
- Dates, version numbers, and document IDs are NOT PII — ignore them
- Company names in public research context are fine — only flag if in a sensitive/private context
- Focus on: personal emails, phone numbers, private names, API keys, SSNs, addresses, financial account numbers

Return a JSON array of findings. If no PII is found, return an empty array [].
Return ONLY valid JSON, no other text.`;

/**
 * LLM-based PII scanning. Sends page content to an AI model for context-aware
 * PII detection. Falls back to regex if no API key is available.
 */
export async function scanPiiWithLlm(
  pages: Array<{ content: string; pagePath: string }>,
  options?: { apiKey?: string; model?: string; onProgress?: (scanned: number, total: number) => void }
): Promise<PiiReport> {
  const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fall back to regex
    return scanPiiReport(pages);
  }

  const openai = new OpenAI({ apiKey });
  const model = options?.model ?? "gpt-4.1-mini";
  const allFindings: PiiFinding[] = [];
  const filesWithPii = new Set<string>();

  // Batch pages into chunks of ~3 to reduce API calls
  const batchSize = 3;
  for (let i = 0; i < pages.length; i += batchSize) {
    const batch = pages.slice(i, i + batchSize);
    const content = batch
      .map((p) => `=== FILE: ${p.pagePath} ===\n${p.content.slice(0, 4000)}`)
      .join("\n\n");

    try {
      const response = await openai.responses.create({
        model,
        input: [
          { role: "system", content: LLM_PII_PROMPT },
          { role: "user", content }
        ],
        temperature: 0
      });

      const text = response.output_text?.trim() ?? "[]";
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const findings = JSON.parse(jsonMatch[0]) as Array<{
          type: string;
          value: string;
          file: string;
          line: number;
          risk?: string;
          reason?: string;
        }>;

        for (const f of findings) {
          if (f.risk === "low") continue; // Skip low-risk (public figures etc.)
          filesWithPii.add(f.file);
          allFindings.push({
            type: f.type ?? "other",
            value: f.value,
            file: f.file,
            line: f.line ?? 0,
            reason: f.reason
          });
        }
      }
    } catch {
      // If LLM call fails for a batch, fall back to regex for those pages
      for (const page of batch) {
        const findings = scanPii(page.content, page.pagePath);
        if (findings.length > 0) {
          filesWithPii.add(page.pagePath);
          allFindings.push(...findings);
        }
      }
    }

    options?.onProgress?.(Math.min(i + batchSize, pages.length), pages.length);
  }

  return {
    findings: allFindings,
    totalFiles: pages.length,
    filesWithPii: filesWithPii.size
  };
}

function makeHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Auto-detect the glob pattern based on folder structure.
 * - If a `pages/` subdir exists, use `pages/**‍/*.md` (backwards compatible)
 * - Otherwise, use `**‍/*.md` (flat folder / Obsidian vault / any structure)
 */
async function detectGlobPattern(wikiRoot: string): Promise<string> {
  try {
    await access(path.join(wikiRoot, "pages"));
    return "pages/**/*.md";
  } catch {
    return "**/*.md";
  }
}

export async function parseWiki(options: ParseWikiOptions): Promise<WikiPage[]> {
  const wikiRoot = path.resolve(options.wikiRoot);
  const globPattern = options.globPattern ?? await detectGlobPattern(wikiRoot);

  const files = await fg(globPattern, {
    cwd: wikiRoot,
    absolute: true,
    ignore: ["**/node_modules/**", "**/.obsidian/**", "**/.git/**"]
  });

  const pages: WikiPage[] = [];

  for (const filePath of files) {
    let markdown = await readFile(filePath, "utf8");
    const fileStat = await stat(filePath);
    const relativePath = path.relative(wikiRoot, filePath);

    // Resolve Obsidian-style [[wikilinks]] to standard markdown
    markdown = resolveWikilinks(markdown);

    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const pageTitle = titleMatch?.[1]?.trim() ?? path.basename(filePath, ".md");
    const summary = makeSummary(markdown);
    const topics = extractTopics(markdown);
    const { depthScore, sourceCount, crossReferenceCount } = computeDepthScore(markdown);
    const piiScrubbedContent = stripPiiForPoC(markdown);

    pages.push({
      pageTitle,
      pagePath: relativePath,
      fullPath: filePath,
      content: piiScrubbedContent,
      summary,
      topics,
      sourceCount,
      depthScore,
      crossReferenceCount,
      lastUpdated: fileStat.mtime.toISOString(),
      contentHash: makeHash(piiScrubbedContent)
    });
  }

  return pages.sort((a, b) => a.pagePath.localeCompare(b.pagePath));
}
