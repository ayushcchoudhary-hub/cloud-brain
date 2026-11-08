/**
 * `npm run demo`: a short walkthrough driven through the real MCP layer.
 * An in-process MCP client calls the server's tools, and every "<" line is text from a real
 * tool response (long lines trimmed for the terminal). No keys, no database, payments simulated.
 *
 *   npm run demo -- --transcript docs/demo-transcript.json   also writes every call and response
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { loadConfig, REPO_ROOT } from "./config.js";
import { createMcpServer } from "./mcp/server.js";
import { bootstrap } from "./store/index.js";

const WIDTH = 96;
const QUERIES = {
  network: "How big is the shadow tanker fleet carrying Russian crude, how does it avoid the price cap, and what enforcement has actually worked since 2024?",
  own: "What FDA pathway would an AI triage tool for chest X-rays most likely use, and what can a PCCP let us change after clearance?",
  nothing: "What does a seed-stage SaaS startup need to get SOC 2 Type I ready: which policies, which tooling, and how long does the auditor's observation window take?",
  budget: "Where is the EU price cap on Russian crude now, how does the dynamic mechanism set it, and what do service providers have to collect under the attestation rules?"
};

type Event =
  | { kind: "user"; text: string }
  | { kind: "note"; text: string }
  | { kind: "tool"; tool: string; args: Record<string, unknown>; response_text: string; is_error: boolean };
interface Step {
  title: string;
  events: Event[];
}

const steps: Step[] = [];
const bold = (s: string) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s);
const dim = (s: string) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s);
const trim = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);

/** Word-wrap to the terminal width. */
function wrap(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current && current.length + word.length + 1 > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Synthesis lines are trimmed (they can be long); everything else is wrapped in full. */
function printResponse(text: string): void {
  if (!text) {
    console.log("  < (empty result)");
    return;
  }
  for (const line of text.split("\n").filter(Boolean)) {
    const parts = /^\[S\d+\]/.test(line) ? [trim(line, WIDTH - 4)] : wrap(line, WIDTH - 4);
    parts.forEach((part, i) => console.log(`${i === 0 ? "  < " : "    "}${part}`));
  }
}

function step(title: string): Step {
  const s: Step = { title, events: [] };
  steps.push(s);
  console.log(`\n${bold(title)}`);
  return s;
}

function say(s: Step, text: string): void {
  s.events.push({ kind: "user", text });
  console.log(`  user: ${text}`);
}

function note(s: Step, text: string): void {
  s.events.push({ kind: "note", text });
  console.log(dim(`  ${text}`));
}

async function call(client: Client, s: Step, tool: string, args: Record<string, unknown>, show: string): Promise<string> {
  console.log(dim(`  > ${tool} ${show}`));
  const result = await client.callTool({ name: tool, arguments: args });
  const content = (result.content ?? []) as Array<{ type: string; text?: string }>;
  const text = content
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n");
  s.events.push({ kind: "tool", tool, args, response_text: text, is_error: Boolean(result.isError) });
  printResponse(text);
  return text;
}

async function main(): Promise<void> {
  const transcriptArg = process.argv.indexOf("--transcript");
  const transcriptPath = transcriptArg >= 0 ? process.argv[transcriptArg + 1] : undefined;

  const config = loadConfig({
    BACKEND: "memory",
    WIKI_DIR: path.join(REPO_ROOT, "sample-wikis"),
    OWN_HANDLE: "otter",
    SYNTH_MODE: "extractive",
    MONTHLY_BUDGET_USDC: "5",
    RECEIPT_SEED: "cloud-brain-demo"
  });
  const { service, loaded } = await bootstrap(config);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createMcpServer(service).connect(serverSide);
  const client = new Client({ name: "cloud-brain-demo", version: "0.2.0" });
  await client.connect(clientSide);

  console.log(bold("Cloud Brain demo") + "  (in-memory, no keys, payments SIMULATED in USDC)");
  const wikis = loaded
    .map((l) => `${l.contributor.handle} (${l.published} pages${l.contributor.handle === config.ownHandle ? ", yours" : ""})`)
    .join(", ");
  console.log(`  wikis (fictional contributors): ${wikis}`);
  console.log(`  demo budget: $${config.limits.monthlyBudgetUsdc.toFixed(2)} USDC per month`);

  const s1 = step("1. Someone else already did this research");
  const found = await call(client, s1, "cloud_brain_search", { query: QUERIES.network }, `"${trim(QUERIES.network, 60)}"`);
  const contributor = /contributor "([a-z0-9-]+)"/.exec(found)?.[1] ?? "kestrel";
  say(s1, "yes, pull it in");
  const pulled = await call(client, s1, "cloud_brain_pull", { query: QUERIES.network, contributor }, `contributor=${contributor}`);
  const receipt = /Receipt (sim_[a-f0-9]+)/.exec(pulled)?.[1];
  if (receipt) {
    await call(client, s1, "cloud_brain_feedback", { receipt_id: receipt, useful: true, rating: 5 }, "useful=true rating=5");
  }

  const s2 = step("2. Your own wiki comes first, and it is free");
  await call(client, s2, "cloud_brain_search", { query: QUERIES.own }, `"${trim(QUERIES.own, 60)}"`);

  const s3 = step("3. Nothing confident, so the server stays quiet");
  await call(client, s3, "cloud_brain_search", { query: QUERIES.nothing }, `"${trim(QUERIES.nothing, 60)}"`);
  note(s3, "agent carries on with normal research. nothing charged.");

  const s4 = step("4. Budget guardrail");
  say(s4, "now pull Kestrel's notes on the EU price cap mechanism");
  await call(client, s4, "cloud_brain_pull", { query: QUERIES.budget, contributor: "kestrel" }, "contributor=kestrel");

  console.log(`\n${dim("Every < line is a real MCP tool response. No real money moved.")}`);
  await client.close();

  if (transcriptPath) {
    const out = path.resolve(transcriptPath);
    await mkdir(path.dirname(out), { recursive: true });
    const transcript = {
      description: "Cloud Brain demo: MCP tool calls and responses. Payments are simulated; amounts in USDC for readability only.",
      own_wiki: config.ownHandle,
      wikis: loaded.map((l) => ({ handle: l.contributor.handle, pages: l.published })),
      monthly_budget_usdc: config.limits.monthlyBudgetUsdc,
      steps
    };
    await writeFile(out, `${JSON.stringify(transcript, null, 2)}\n`, "utf8");
    console.log(dim(`transcript written to ${path.relative(process.cwd(), out)}`));
  }
}

main().catch((error) => {
  console.error(`demo failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
