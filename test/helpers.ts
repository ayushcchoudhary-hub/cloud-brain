import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig, REPO_ROOT } from "../src/config.js";
import { bootstrap } from "../src/store/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export const fixture = (name: string) => readFileSync(path.join(here, "fixtures", name), "utf8");

/** Memory backend over the bundled sample wikis, with optional env overrides. */
export async function sampleService(env: Record<string, string> = {}) {
  const config = loadConfig({
    BACKEND: "memory",
    WIKI_DIR: path.join(REPO_ROOT, "sample-wikis"),
    OWN_HANDLE: "otter",
    SYNTH_MODE: "extractive",
    ...env
  });
  return bootstrap(config);
}

/** The demo story queries. src/demo.ts runs the same questions. */
export const STORY = {
  network: "I'm preparing a briefing for a Baltic port authority. Research the shadow tanker fleet that carries Russian crude: how many vessels and barrels it moves, how ships get around the price cap and insurance rules, which sanctions and inspections since 2024 actually changed behaviour, and what the spill risk looks like for coastal states.",
  own: "We're building an AI triage tool for chest X-rays. Work out which FDA pathway it would most likely use, what clinical evidence reviewers expect, and what a PCCP would let us change after clearance without a new submission.",
  nothing: "What does a seed-stage SaaS startup need to get SOC 2 Type I ready: which policies, which tooling, and how long does the auditor's observation window take?",
  budget: "Also research the EU price cap on Russian crude: where it sits now, how the dynamic mechanism resets it, and what service providers have to collect under the attestation rules.",
  heatPump: "How big a heat pump does a Victorian terraced house need, and what does the Boiler Upgrade Scheme pay towards it?"
};
