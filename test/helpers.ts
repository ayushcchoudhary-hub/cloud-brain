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

/** The queries from the demo story, shared by the calibration test and the demo. */
export const STORY = {
  network: "how do I build a golden test set to measure RAG retrieval quality, and which metrics should I track?",
  own: "how should I write MCP tool descriptions so the model picks the right tool?",
  overlap: "how do I test that an agent picks the right tool with the right arguments?",
  nothing: "what should I check before signing a commercial office lease?",
  partial: "how hard is my tap water and do I need to descale my kettle?"
};
