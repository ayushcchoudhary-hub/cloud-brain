import assert from "node:assert/strict";
import { test } from "node:test";

import { TfIdfIndex } from "../src/search/tfidf.js";
import { tokenize, tokensWithBigrams } from "../src/search/tokenize.js";
import { sampleService, STORY } from "./helpers.js";

test("tokenize drops stop words and stems plurals", () => {
  assert.deepEqual(tokenize("How do the Metrics and Queries work?"), ["metric", "query", "work"]);
  assert.ok(tokensWithBigrams("hybrid search reranking").includes("hybrid_search"));
});

test("TfIdfIndex ranks the on-topic doc first and ignores unknown terms", () => {
  const index = new TfIdfIndex();
  index.upsert({ id: "rag", title: "RAG retrieval metrics", topics: ["recall"], body: "Track recall at k and MRR on a labeled set." });
  index.upsert({ id: "water", title: "Water for espresso", topics: ["hardness"], body: "Hardness and alkalinity change extraction and scale." });
  const hits = index.query("which retrieval metrics should I track?");
  assert.equal(hits[0]?.id, "rag");
  assert.ok(hits.every((h) => h.score > 0 && h.score <= 1));
  assert.deepEqual(index.query("zebra quantum lease"), []);
});

// Calibration: the demo story must hold with the memory backend's thresholds (src/config.ts).
test("story 1: confident network match from kestrel, no own match", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.network);
  assert.ok(match);
  assert.equal(match.top.contributorHandle, "kestrel");
  assert.equal(match.top.isOwn, false);
  assert.ok(match.top.priceUsdc > 0);
});

test("story 2: own wiki matches first and is free", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.own);
  assert.ok(match?.top.isOwn);
  assert.equal(match.top.contributorHandle, "otter");
  assert.equal(match.top.priceUsdc, 0);
});

test("story 3: off-topic question gets no match at all", async () => {
  const { service } = await sampleService();
  assert.equal(await service.findMatch(STORY.nothing), null);
});

test("story 4: the reserve-yield question matches kestrel's yield page", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.budget);
  assert.equal(match?.top.contributorHandle, "kestrel");
  assert.equal(match?.top.pagePath, "pages/yield-and-distribution-economics.md");
});

test("a far-away wiki only answers its own topic", async () => {
  const { service } = await sampleService();
  for (const q of [STORY.network, STORY.own, STORY.budget]) {
    const match = await service.findMatch(q);
    assert.notEqual(match?.top.contributorHandle, "heron", q);
  }
  const match = await service.findMatch(STORY.heatPump);
  assert.equal(match?.top.contributorHandle, "heron");
});
