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
  network: "How big is the shadow tanker fleet carrying Russian crude, how does it avoid the price cap, and what enforcement has actually worked since 2024?",
  own: "What FDA pathway would an AI triage tool for chest X-rays most likely use, and what can a PCCP let us change after clearance?",
  nothing: "What does a seed-stage SaaS startup need to get SOC 2 Type I ready: which policies, which tooling, and how long does the auditor's observation window take?",
  budget: "Where is the EU price cap on Russian crude now, how does the dynamic mechanism set it, and what do service providers have to collect under the attestation rules?",
  heatPump: "How big a heat pump does a Victorian terraced house need, and what does the Boiler Upgrade Scheme pay towards it?"
};
