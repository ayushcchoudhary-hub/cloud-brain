import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import type { SpendLimits } from "./pricing.js";
import type { ScoreThresholds } from "./search/rerank.js";
import type { SynthMode } from "./synth.js";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Score scales differ by backend. TF-IDF cosine on short queries runs much lower than
 * OpenAI embedding cosine, so each backend gets its own gates. The memory values are
 * calibrated against sample-wikis/ by the story tests in test/search.test.ts.
 */
export const THRESHOLDS: Record<"memory" | "supabase", ScoreThresholds> = {
  memory: { candidateFloor: 0.03, confident: 0.4, ownConfident: 0.33, rawScale: 4 },
  supabase: { candidateFloor: 0.2, confident: 0.6, ownConfident: 0.45, rawScale: 1 }
};

const bool = z
  .string()
  .optional()
  .transform((v) => v?.toLowerCase() === "true");

const envSchema = z.object({
  BACKEND: z.enum(["memory", "supabase"]).default("memory"),
  WIKI_DIR: z.string().default(path.join(REPO_ROOT, "sample-wikis")),
  OWN_HANDLE: z.string().default("otter"),
  BUYER_ID: z.string().default("local-user"),
  PER_PULL_MAX_USDC: z.coerce.number().positive().default(5),
  MONTHLY_BUDGET_USDC: z.coerce.number().positive().default(20),
  MAX_PULLS_PER_HOUR: z.coerce.number().int().positive().default(20),
  QUOTE_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  CLOUD_BRAIN_MARKETPLACE: bool,
  SYNTH_MODE: z.enum(["extractive", "openai"]).default("extractive"),
  SYNTH_MODEL: z.string().default("gpt-4.1-mini"),
  EMBED_MODEL: z.string().default("text-embedding-3-large"),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
});

export interface Config {
  backend: "memory" | "supabase";
  wikiDir: string;
  ownHandle: string;
  buyerId: string;
  limits: SpendLimits;
  quoteTtlMinutes: number;
  marketplaceTools: boolean;
  synthMode: SynthMode;
  synthModel: string;
  embedModel: string;
  thresholds: ScoreThresholds;
  supabase?: { url: string; serviceRoleKey: string };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = envSchema.parse(env);
  if (e.BACKEND === "supabase" && (!e.SUPABASE_URL || !e.SUPABASE_SERVICE_ROLE_KEY || !e.OPENAI_API_KEY)) {
    throw new Error(
      "BACKEND=supabase needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPENAI_API_KEY. Leave BACKEND unset for the zero-setup in-memory mode."
    );
  }
  if (e.SYNTH_MODE === "openai" && !e.OPENAI_API_KEY) {
    throw new Error("SYNTH_MODE=openai needs OPENAI_API_KEY.");
  }
  return {
    backend: e.BACKEND,
    wikiDir: path.resolve(e.WIKI_DIR),
    ownHandle: e.OWN_HANDLE,
    buyerId: e.BUYER_ID,
    limits: {
      perPullMaxUsdc: e.PER_PULL_MAX_USDC,
      monthlyBudgetUsdc: e.MONTHLY_BUDGET_USDC,
      maxPullsPerHour: e.MAX_PULLS_PER_HOUR
    },
    quoteTtlMinutes: e.QUOTE_TTL_MINUTES,
    marketplaceTools: e.CLOUD_BRAIN_MARKETPLACE,
    synthMode: e.SYNTH_MODE,
    synthModel: e.SYNTH_MODEL,
    embedModel: e.EMBED_MODEL,
    thresholds: THRESHOLDS[e.BACKEND],
    supabase:
      e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY
        ? { url: e.SUPABASE_URL, serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY }
        : undefined
  };
}
