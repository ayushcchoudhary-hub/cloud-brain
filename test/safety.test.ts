import assert from "node:assert/strict";
import { test } from "node:test";

import { scanPromptInjection, verifyContentHash } from "../src/safety.js";
import { parsePage, sha256 } from "../src/wiki/parse.js";
import { fixture, sampleService } from "./helpers.js";

test("injection fixture is flagged, clean fixture is not", () => {
  const flagged = scanPromptInjection(fixture("injection.md"));
  assert.ok(flagged.flagged);
  assert.ok(flagged.matches.includes("ignore-previous-instructions"));
  assert.equal(scanPromptInjection(fixture("clean.md")).flagged, false);
});

test("no bundled sample page trips the injection scan", async () => {
  const { loaded } = await sampleService();
  assert.deepEqual(loaded.flatMap((l) => l.quarantined), []);
});

test("verifyContentHash catches edited content", () => {
  const content = "Light roast: setting 8.";
  assert.ok(verifyContentHash(content, sha256(content)));
  assert.equal(verifyContentHash(`${content} Edited.`, sha256(content)), false);
  assert.equal(verifyContentHash(content, ""), false);
});

test("publish quarantines an injected page so it can never be pulled", async () => {
  const { service } = await sampleService();
  const page = parsePage(fixture("injection.md"), "grinder-settings.md", "/tmp/g.md", "");
  const result = await service.publish("mallory", "Mallory", [page]);
  assert.equal(result.published, 0);
  assert.equal(result.quarantined[0]?.pagePath, "grinder-settings.md");
  const hits = await service.search("grinder settings for roast levels");
  assert.ok(hits.every((h) => h.contributorHandle !== "mallory"));
});
