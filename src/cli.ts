/**
 * cloud-brain CLI
 *   search "<question>"          rank pages across the loaded wikis (any backend)
 *   scan <folder>                PII + prompt-injection report for a wiki, publishes nothing
 *   publish <folder> <handle>    publish a wiki to the Supabase backend (BACKEND=supabase)
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import { loadConfig } from "./config.js";
import { scanPromptInjection } from "./safety.js";
import { bootstrap, displayNameFor } from "./store/index.js";
import { parseWiki } from "./wiki/parse.js";
import { scanPiiReport } from "./wiki/pii.js";

const HELP = `Usage:
  npm run cli -- search "<question>"
  npm run cli -- scan <folder>
  npm run cli -- publish <folder> <handle>   (needs BACKEND=supabase)`;

async function scan(folder: string): Promise<void> {
  const pages = await parseWiki(folder);
  // Scan the original files: parsed content is already redacted.
  const raw = await Promise.all(
    pages.map(async (p) => ({ pagePath: p.pagePath, content: await readFile(p.fullPath, "utf8") }))
  );
  const pii = scanPiiReport(raw);
  console.log(`${pages.length} pages in ${path.resolve(folder)}`);
  console.log(`PII: ${pii.findings.length} finding(s) in ${pii.filesWithPii} file(s). They are redacted before publishing.`);
  for (const f of pii.findings) console.log(`  ${f.file}:${f.line} ${f.type} "${f.value}"`);
  for (const page of raw) {
    const result = scanPromptInjection(page.content);
    if (result.flagged) console.log(`  ${page.pagePath}: possible prompt injection (${result.matches.join(", ")}), will be quarantined`);
  }
}

async function search(query: string): Promise<void> {
  const { service } = await bootstrap(loadConfig());
  const results = await service.search(query, { limit: 5 });
  if (results.length === 0) console.log("No candidates.");
  for (const r of results) {
    console.log(
      `${r.score.toFixed(2)} ${r.confidence.padEnd(6)} ${r.contributorHandle.padEnd(8)} ${r.pageTitle}  (${r.isOwn ? "own" : `$${r.priceUsdc.toFixed(2)} USDC simulated`})`
    );
  }
}

async function publish(folder: string, handle: string): Promise<void> {
  const config = loadConfig();
  if (config.backend !== "supabase") {
    throw new Error("publish writes to Supabase. Set BACKEND=supabase. The memory backend loads WIKI_DIR on start instead.");
  }
  await scan(folder);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Publish as "${handle}"? (y/n) `);
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) return console.log("Cancelled.");
  const { service } = await bootstrap(config);
  const result = await service.publish(handle, displayNameFor(handle), await parseWiki(folder));
  console.log(`Published ${result.published} pages, quarantined ${result.quarantined.length}.`);
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  if (command === "search" && rest[0]) return search(rest.join(" "));
  if (command === "scan" && rest[0]) return scan(rest[0]);
  if (command === "publish" && rest[0] && rest[1]) return publish(rest[0], rest[1]);
  console.log(HELP);
}

main().catch((error) => {
  console.error(`cloud-brain: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
