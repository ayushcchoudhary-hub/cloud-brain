/**
 * `npm run mcp`: stdio MCP server. Defaults to the in-memory backend with the bundled
 * sample wikis, so it runs with no keys and no database. Logs go to stderr; stdout is the protocol.
 */
import "dotenv/config";

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "../config.js";
import { bootstrap } from "../store/index.js";
import { createMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const { service, loaded } = await bootstrap(config);
  for (const { contributor, published, quarantined } of loaded) {
    console.error(`cloud-brain: loaded ${published} pages from ${contributor.handle}` +
      (quarantined.length ? ` (${quarantined.length} quarantined)` : ""));
  }
  console.error(`cloud-brain: backend=${config.backend}, own wiki=${config.ownHandle}, payments simulated`);
  await createMcpServer(service).connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(`cloud-brain: failed to start: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
