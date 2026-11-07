import { createHash } from "node:crypto";
import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { STOP_WORDS } from "../search/tokenize.js";
import type { WikiPage } from "../types.js";
import { redactPii } from "./pii.js";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/** First blockquote line, else the first real paragraph. */
export function makeSummary(markdown: string): string {
  const quote = markdown.match(/^>\s+(.+)$/m);
  if (quote?.[1]) {
    return quote[1].trim();
  }
  const paragraph = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`{1,3}[^`]+`{1,3}/g, "")
    .replace(/[>*_]/g, "")
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .find((line) => line.length > 40);
  return paragraph ? paragraph.slice(0, 220) : "No summary available.";
}

/** Most frequent meaningful terms, with heading words counted twice. */
export function extractTopics(markdown: string, limit = 10): string[] {
  const split = (text: string) => text.toLowerCase().split(/[^a-z0-9+-]+/g);
  const headingTerms = [...markdown.matchAll(/^#{2,6}\s+(.+)$/gm)]
    .flatMap((match) => split(match[1] ?? ""))
    .filter((term) => term.length >= 4 && !STOP_WORDS.has(term));
  const bodyTerms = split(markdown.replace(/```[\s\S]*?```/g, "")).filter(
    (term) => term.length >= 5 && !STOP_WORDS.has(term)
  );

  const counts = new Map<string, number>();
  for (const term of [...headingTerms, ...bodyTerms]) {
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([topic]) => topic);
}

/** Obsidian [[page]] and [[page|alias]] links become normal markdown links. */
export function resolveWikilinks(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g,
    (_match, target: string, alias?: string) => {
      const display = alias?.trim() || target.trim();
      return `[${display}](${target.trim().replace(/\s+/g, "-")}.md)`;
    }
  );
}

/** Rough 0..1 "how much work went into this page": length, structure, sources, cross-links. */
export function computeDepthScore(markdown: string): {
  depthScore: number;
  sourceCount: number;
  crossReferenceCount: number;
} {
  const headingCount = (markdown.match(/^#{2,6}\s+/gm) ?? []).length;
  const targets = [...markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)].map((m) => m[1] ?? "");
  const sourceCount = targets.filter((t) => /^https?:\/\//.test(t)).length;
  const crossReferenceCount = targets.filter((t) => t.endsWith(".md")).length;

  const depthScore = clamp01(
    clamp01(markdown.length / 7000) * 0.45 +
      clamp01(headingCount / 18) * 0.2 +
      clamp01(sourceCount / 8) * 0.2 +
      clamp01(crossReferenceCount / 14) * 0.15
  );

  return { depthScore: Number(depthScore.toFixed(3)), sourceCount, crossReferenceCount };
}

/** Parse one markdown document. Exported for tests. */
export function parsePage(
  markdown: string,
  pagePath: string,
  fullPath: string,
  lastUpdated: string
): WikiPage {
  const body = resolveWikilinks(markdown.replace(/^---\n[\s\S]*?\n---\n/, ""));
  const content = redactPii(body);
  const { depthScore, sourceCount, crossReferenceCount } = computeDepthScore(body);
  return {
    pageTitle: body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? path.basename(pagePath, ".md"),
    pagePath,
    fullPath,
    content,
    summary: makeSummary(content),
    topics: extractTopics(content),
    sourceCount,
    depthScore,
    crossReferenceCount,
    lastUpdated,
    contentHash: sha256(content)
  };
}

/** Read every .md file under a folder (or its pages/ subfolder if present). */
export async function parseWiki(wikiRoot: string): Promise<WikiPage[]> {
  const root = path.resolve(wikiRoot);
  const pattern = await access(path.join(root, "pages")).then(
    () => "pages/**/*.md",
    () => "**/*.md"
  );
  const files = await fg(pattern, {
    cwd: root,
    absolute: true,
    ignore: ["**/node_modules/**", "**/.obsidian/**", "**/.git/**"]
  });

  const pages: WikiPage[] = [];
  for (const file of files) {
    const [markdown, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    pages.push(parsePage(markdown, path.relative(root, file), file, info.mtime.toISOString()));
  }
  return pages.sort((a, b) => a.pagePath.localeCompare(b.pagePath));
}
