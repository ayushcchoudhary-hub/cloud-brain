import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import type { CloudBrainService } from "../service.js";
import { handlers, type ToolResult } from "./handlers.js";
import { DEFAULT_TOOLS, MARKETPLACE_TOOLS } from "./tools.js";

/** Build an MCP server around a service. Transport-agnostic: connect stdio or an in-memory pair. */
export function createMcpServer(service: CloudBrainService): Server {
  const server = new Server({ name: "cloud-brain", version: "0.2.0" }, { capabilities: { tools: {} } });
  const tools = service.config.marketplaceTools ? [...DEFAULT_TOOLS, ...MARKETPLACE_TOOLS] : [...DEFAULT_TOOLS];
  const enabled = new Set<string>(tools.map((t) => t.name));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request): Promise<ToolResult> => {
    const { name, arguments: args = {} } = request.params;
    const handler = handlers[name];
    if (!handler || !enabled.has(name)) {
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
    try {
      return await handler(service, args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `Tool failed: ${message}` }], isError: true };
    }
  });

  return server;
}
