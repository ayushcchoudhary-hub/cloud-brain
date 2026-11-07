#!/usr/bin/env node
// Launcher for MCP clients (Claude Desktop, Cursor, etc.): `node /path/to/cloud-brain/bin/mcp.mjs`.
// Registers tsx relative to this file, so it works from any working directory.
import { register } from "tsx/esm/api";

register();
await import("../src/mcp/stdio.ts");
