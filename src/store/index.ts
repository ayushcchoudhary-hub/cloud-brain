import { readdir } from "node:fs/promises";
import path from "node:path";

import type { Config } from "../config.js";
import { createService, type CloudBrainService, type PublishResult } from "../service.js";
import { parseWiki } from "../wiki/parse.js";
import { MemoryStore } from "./memory.js";
import type { Store } from "./types.js";

export async function createStore(config: Config): Promise<Store> {
  if (config.backend === "supabase") {
    if (!config.supabase) throw new Error("Supabase config missing.");
    const { SupabaseStore } = await import("./supabase.js");
    return new SupabaseStore(config.supabase.url, config.supabase.serviceRoleKey, config.embedModel);
  }
  return new MemoryStore();
}

export const displayNameFor = (handle: string) => handle.charAt(0).toUpperCase() + handle.slice(1);

/** Publish every subfolder of `wikiDir` as one contributor whose handle is the folder name. */
export async function loadWikiFolders(service: CloudBrainService, wikiDir: string): Promise<PublishResult[]> {
  const entries = await readdir(wikiDir, { withFileTypes: true });
  const results: PublishResult[] = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const pages = await parseWiki(path.join(wikiDir, entry.name));
    results.push(await service.publish(entry.name, displayNameFor(entry.name), pages));
  }
  return results;
}

/**
 * Ready-to-use service. The memory backend starts empty, so it loads the wiki folders;
 * the Supabase backend already holds whatever was published with `cloud-brain publish`.
 */
export async function bootstrap(config: Config): Promise<{ service: CloudBrainService; loaded: PublishResult[] }> {
  const service = createService(await createStore(config), config);
  const loaded = config.backend === "memory" ? await loadWikiFolders(service, config.wikiDir) : [];
  return { service, loaded };
}
