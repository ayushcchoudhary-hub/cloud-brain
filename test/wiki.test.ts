import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";

import { REPO_ROOT } from "../src/config.js";
import { parsePage, parseWiki } from "../src/wiki/parse.js";
import { redactPii, scanPii } from "../src/wiki/pii.js";
import { fixture } from "./helpers.js";

test("parsePage reads title, summary, wikilinks and depth", () => {
  const md = "# Cold Brew Notes\n\n> Ratios and steep times.\n\n## Ratio\n\nSee [[brew ratios|ratios]] and [a source](https://example.com).\n";
  const page = parsePage(md, "cold-brew.md", "/tmp/cold-brew.md", "2026-04-07T00:00:00.000Z");
  assert.equal(page.pageTitle, "Cold Brew Notes");
  assert.equal(page.summary, "Ratios and steep times.");
  assert.match(page.content, /\[ratios\]\(brew-ratios\.md\)/);
  assert.equal(page.sourceCount, 1);
  assert.equal(page.crossReferenceCount, 1);
  assert.ok(page.depthScore > 0 && page.depthScore < 1);
  assert.equal(page.contentHash, parsePage(md, "x.md", "/x", "").contentHash, "hash depends only on content");
});

test("parseWiki loads every page of a sample wiki", async () => {
  const pages = await parseWiki(path.join(REPO_ROOT, "sample-wikis", "otter"));
  assert.equal(pages.length, 5);
  assert.ok(pages.every((p) => p.pagePath.startsWith("pages/") && p.pageTitle.length > 0));
});

test("PII fixture: one email and one phone, both redacted", () => {
  const findings = scanPii(fixture("pii.md"), "pii.md");
  assert.deepEqual(findings.map((f) => f.type).sort(), ["email", "phone"]);
  const redacted = redactPii(fixture("pii.md"));
  assert.match(redacted, /\[REDACTED_EMAIL\]/);
  assert.match(redacted, /\[REDACTED_PHONE\]/);
  assert.doesNotMatch(redacted, /example\.com|7946/);
});

test("clean fixture, dates and code blocks produce no PII findings", () => {
  assert.equal(scanPii(fixture("clean.md"), "clean.md").length, 0);
  assert.equal(scanPii("Published 2026-04-08, revised 2026-05-01.", "d.md").length, 0);
  assert.equal(scanPii("```\nmail me@example.com\n```", "c.md").length, 0);
});
