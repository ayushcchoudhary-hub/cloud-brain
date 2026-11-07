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
test("story 1: confident network match from wren, no own match", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.network);
  assert.ok(match);
  assert.equal(match.top.contributorHandle, "wren");
  assert.equal(match.top.isOwn, false);
  assert.ok(["pages/rag-retrieval-metrics.md", "pages/golden-datasets.md"].includes(match.top.pagePath));
});

test("story 2: own wiki matches first and is free", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.own);
  assert.ok(match?.top.isOwn);
  assert.equal(match.top.contributorHandle, "otter");
  assert.equal(match.top.priceUsdc, 0);
});

test("story 3: own wiki first, wren offered as paid alternative", async () => {
  const { service } = await sampleService();
  const match = await service.findMatch(STORY.overlap);
  assert.equal(match?.top.contributorHandle, "otter");
  assert.equal(match?.alternative?.contributorHandle, "wren");
  assert.equal(match?.alternative?.pagePath, "pages/evaluating-tool-use-agents.md");
});

test("story 4: off-topic question gets no match at all", async () => {
  const { service } = await sampleService();
  assert.equal(await service.findMatch(STORY.nothing), null);
});

test("story 5: closest page for the kettle question is finch's water page", async () => {
  const { service } = await sampleService();
  const [top] = await service.search(STORY.partial);
  assert.equal(top?.pagePath, "pages/water-for-espresso.md");
});
