#!/usr/bin/env node
import "dotenv/config";

import { createInterface } from "node:readline";
import path from "node:path";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

import { parseWiki, scanPiiReport, scanPiiWithLlm, type PiiReport } from "../../wiki-parser/src/index.js";
import { createCloudBrainService } from "../../retrieval/src/index.js";

const HELP = `
cloud-brain — publish markdown knowledge to the Cloud Brain network

Usage:
  cloud-brain publish <path>   Scan, review, and publish a folder of markdown files
  cloud-brain init             Set up environment variables (Supabase, OpenAI)
  cloud-brain help             Show this help message

Environment variables (set in .env or export):
  SUPABASE_URL                 Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key
  OPENAI_API_KEY               OpenAI API key (for embeddings)
  CONTRIBUTOR_DISPLAY_NAME     Your display name (default: "Local Contributor")
  CONTRIBUTOR_WALLET           Your wallet address (default: "local-dev-wallet")
`.trim();

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function printPiiReport(report: PiiReport): void {
  if (report.findings.length === 0) {
    console.log("\n  PII scan: No potential PII detected.");
    return;
  }

  const isLlmScan = report.findings.some((f) => f.reason);
  console.log(`\n  PII scan: Found ${report.findings.length} potential PII item(s) in ${report.filesWithPii} file(s)`);
  console.log(`  (${isLlmScan ? "AI-powered scan" : "Basic regex scan"} — review carefully before publishing)\n`);

  // Group by type
  const byType = new Map<string, typeof report.findings>();
  for (const f of report.findings) {
    const list = byType.get(f.type) ?? [];
    list.push(f);
    byType.set(f.type, list);
  }

  for (const [type, findings] of byType) {
    console.log(`  ${type} (${findings.length}):`);
    for (const f of findings.slice(0, 5)) {
      const reason = f.reason ? ` (${f.reason})` : "";
      console.log(`    - ${f.file}:${f.line} — "${f.value}"${reason}`);
    }
    if (findings.length > 5) {
      console.log(`    ... and ${findings.length - 5} more`);
    }
  }
}

async function commandPublish(folderPath: string): Promise<void> {
  const resolved = path.resolve(folderPath);

  if (!existsSync(resolved)) {
    console.error(`Error: path does not exist: ${resolved}`);
    process.exit(1);
  }

  // Check env
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    console.error("Run 'cloud-brain init' to set up environment variables.");
    process.exit(1);
  }

  console.log(`\nScanning: ${resolved}`);
  const pages = await parseWiki({ wikiRoot: resolved });

  if (pages.length === 0) {
    console.error("No .md files found in the specified folder.");
    process.exit(1);
  }

  // Collect topics across all pages
  const allTopics = new Map<string, number>();
  for (const page of pages) {
    for (const topic of page.topics) {
      allTopics.set(topic, (allTopics.get(topic) ?? 0) + 1);
    }
  }
  const topTopics = [...allTopics.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([t]) => t);

  // Summary
  console.log(`\n  Found ${pages.length} page(s) covering these topics:`);
  console.log(`  ${topTopics.join(", ")}`);
  console.log(`\n  Pages:`);
  for (const page of pages.slice(0, 20)) {
    const depth = page.depthScore >= 0.7 ? "deep" : page.depthScore >= 0.4 ? "moderate" : "light";
    console.log(`    ${page.pagePath} — "${page.pageTitle}" (${depth}, ${page.sourceCount} sources)`);
  }
  if (pages.length > 20) {
    console.log(`    ... and ${pages.length - 20} more`);
  }

  // PII scan — read original (un-stripped) content for accurate detection
  const rawPages: Array<{ content: string; pagePath: string }> = [];
  for (const page of pages) {
    const raw = await readFile(page.fullPath, "utf8");
    rawPages.push({ content: raw, pagePath: page.pagePath });
  }

  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  if (hasApiKey) {
    console.log("\n  Running AI-powered PII scan...");
  }
  const piiReport = await scanPiiWithLlm(rawPages, {
    onProgress: (scanned, total) => {
      if (hasApiKey) {
        process.stdout.write(`\r  Scanning... ${scanned}/${total} pages`);
      }
    }
  });
  if (hasApiKey) {
    process.stdout.write("\r" + " ".repeat(40) + "\r"); // Clear progress line
  }
  printPiiReport(piiReport);

  // Confirmation
  console.log("");
  const answer = await prompt(`  Publish ${pages.length} pages to Cloud Brain? (y/n) `);
  if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
    console.log("  Cancelled.");
    process.exit(0);
  }

  // Publish
  console.log("\n  Embedding and uploading...");
  const service = await createCloudBrainService();
  const contributor = await service.ensureContributor();
  const upserted = await service.upsertPages(pages);

  console.log(`\n  Published ${upserted} pages to Cloud Brain.`);
  console.log(`  Contributor: ${contributor.displayName} (${contributor.id})`);
  console.log(`  Topics: ${topTopics.join(", ")}`);
  console.log(`\n  Others can now find your research via Cloud Brain MCP tools.`);
}

async function commandInit(): Promise<void> {
  const envPath = path.resolve(".env");
  let existing = "";
  if (existsSync(envPath)) {
    existing = readFileSync(envPath, "utf8");
    console.log(`  Found existing .env file at ${envPath}`);
  }

  const vars: Record<string, string> = {};

  console.log("\n  Cloud Brain Setup\n");

  if (!process.env.SUPABASE_URL) {
    vars.SUPABASE_URL = await prompt("  Supabase project URL: ");
  } else {
    console.log(`  SUPABASE_URL: already set`);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    vars.SUPABASE_SERVICE_ROLE_KEY = await prompt("  Supabase service role key: ");
  } else {
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: already set`);
  }

  if (!process.env.OPENAI_API_KEY) {
    vars.OPENAI_API_KEY = await prompt("  OpenAI API key (for embeddings): ");
  } else {
    console.log(`  OPENAI_API_KEY: already set`);
  }

  if (!process.env.CONTRIBUTOR_DISPLAY_NAME) {
    vars.CONTRIBUTOR_DISPLAY_NAME = await prompt("  Your display name (e.g. GitHub username): ");
  } else {
    console.log(`  CONTRIBUTOR_DISPLAY_NAME: already set`);
  }

  const newEntries = Object.entries(vars)
    .filter(([, v]) => v.length > 0)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  if (newEntries.length > 0) {
    const content = existing ? existing.trimEnd() + "\n" + newEntries + "\n" : newEntries + "\n";
    writeFileSync(envPath, content);
    console.log(`\n  Saved to ${envPath}`);
  } else {
    console.log(`\n  All variables already configured.`);
  }

  console.log(`  Run 'cloud-brain publish <path>' to publish your knowledge.`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  if (command === "init") {
    await commandInit();
    return;
  }

  if (command === "publish") {
    const folderPath = args[1];
    if (!folderPath) {
      console.error("Error: provide a path to publish. Usage: cloud-brain publish <path>");
      process.exit(1);
    }
    await commandPublish(folderPath);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.log(HELP);
  process.exit(1);
}

main().catch((error) => {
  if (error instanceof Error) {
    console.error(`cloud-brain error: ${error.message}`);
  } else {
    console.error("cloud-brain failed with unexpected error");
  }
  process.exit(1);
});
