import assert from "node:assert/strict";
import { test } from "node:test";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createMcpServer } from "../src/mcp/server.js";
import { sampleService, STORY } from "./helpers.js";

async function connect(env: Record<string, string> = {}) {
  const { service } = await sampleService(env);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(service).connect(serverSide);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientSide);
  return client;
}

const text = (result: Record<string, unknown>) =>
  ((result.content ?? []) as Array<{ text?: string }>).map((c) => c.text ?? "").join("\n");

test("default surface is 3 tools; marketplace flag adds 4", async () => {
  const names = (await (await connect()).listTools()).tools.map((t) => t.name);
  assert.deepEqual(names, ["cloud_brain_search", "cloud_brain_pull", "cloud_brain_feedback"]);
  const all = (await (await connect({ CLOUD_BRAIN_MARKETPLACE: "true" })).listTools()).tools;
  assert.equal(all.length, 7);
});

test("search returns an empty result when nothing is confident", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "cloud_brain_search", arguments: { query: STORY.nothing } });
  assert.equal(text(result), "");
  assert.ok(!result.isError);
});

test("search offer and pull receipt are labelled simulated USDC", async () => {
  const client = await connect();
  const offer = text(await client.callTool({ name: "cloud_brain_search", arguments: { query: STORY.network } }));
  assert.match(offer, /USDC \(simulated\)/);
  const pulled = text(await client.callTool({ name: "cloud_brain_pull", arguments: { query: STORY.network, contributor: "kestrel" } }));
  assert.match(pulled, /SIMULATED payment: \$\d+\.\d{2} USDC to Mei Ong, Singapore\. Receipt sim_/);
});

test("bad arguments and hidden tools return readable errors", async () => {
  const client = await connect();
  const bad = await client.callTool({ name: "cloud_brain_search", arguments: { query: "x" } });
  assert.ok(bad.isError);
  assert.match(text(bad), /Invalid arguments/);
  const hidden = await client.callTool({ name: "cloud_brain_settle", arguments: { quote_id: "x" } });
  assert.ok(hidden.isError);
});
