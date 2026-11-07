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
  network: "Compare USDC, PYUSD and USDe for a company treasury holding $5M: reserve model, redemption path and fees, and regulatory exposure under the GENIUS Act.",
  own: "How should an agent decide whether to pay for a tool call mid-task, and how does an x402 payment actually settle on-chain?",
  nothing: "What does a seed-stage SaaS startup need to get SOC 2 Type I ready: which policies, which tooling, and how long does the auditor's observation window take?",
  budget: "Who keeps the reserve yield on USDC, PYUSD and USDG, and what is the GENIUS Act position on stablecoin rewards programs?",
  heatPump: "How big a heat pump does a Victorian terraced house need, and what does the Boiler Upgrade Scheme pay towards it?"
};
