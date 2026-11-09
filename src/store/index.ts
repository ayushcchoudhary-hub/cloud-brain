import { readFile, readdir } from "node:fs/promises";
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

/**
 * A wiki folder may carry a `contributor.json` like `{ "name": "Mei Ong", "location": "Singapore" }`.
 * The display name becomes "Mei Ong, Singapore". Without the file, the folder name is used.
 */
async function contributorName(folder: string, handle: string): Promise<string> {
  try {
    const meta = JSON.parse(await readFile(path.join(folder, "contributor.json"), "utf8")) as { name?: string; location?: string };
    if (!meta.name) return displayNameFor(handle);
    return meta.location ? `${meta.name}, ${meta.location}` : meta.name;
  } catch {
    return displayNameFor(handle);
  }
}

/** Publish every subfolder of `wikiDir` as one contributor whose handle is the folder name. */
export async function loadWikiFolders(service: CloudBrainService, wikiDir: string): Promise<PublishResult[]> {
  const entries = await readdir(wikiDir, { withFileTypes: true });
  const results: PublishResult[] = [];
  for (const entry of entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
    const folder = path.join(wikiDir, entry.name);
    const pages = await parseWiki(folder);
    results.push(await service.publish(entry.name, await contributorName(folder, entry.name), pages));
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
