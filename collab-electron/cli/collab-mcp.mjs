#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerCanvasMcpTools } from "./collab-mcp-tools.mjs";
import { rpcCall } from "./collab-rpc.mjs";

async function main() {
  const server = new McpServer({
    name: "collaborator-canvas",
    version: "0.1.0",
  });

  registerCanvasMcpTools(server, rpcCall);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("collab-canvas-mcp error:", error);
  process.exit(1);
});
