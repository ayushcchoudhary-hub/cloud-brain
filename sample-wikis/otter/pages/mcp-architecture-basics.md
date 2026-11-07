# MCP Architecture Basics

> The moving parts of the Model Context Protocol: hosts, clients and servers, the three server primitives, and how to pick between stdio and HTTP transports.

## The roles

**Host.** The app the user is in: a desktop chat app, an IDE, a coding agent. It owns the model session and decides what the model can see.

**Client.** A connector inside the host that holds one connection to one server. A host with five servers runs five clients.

**Server.** Your code. It exposes capabilities over the protocol and knows nothing about which model sits on the other end.

Messages are JSON-RPC 2.0: requests with an id, responses with a matching id, and notifications with no id. On connect, client and server exchange an initialize request that agrees on a protocol version and lists the capabilities each side supports.

## The three server primitives

**Tools.** Actions the model can choose to run, each with a name, a description and a JSON Schema for inputs. The model decides when to use them. This is where most of the value and most of the risk live. Design notes in [[tool-design-patterns]].

**Resources.** Read-only data addressed by URI, like a file, a database row or a doc page. The host or user usually decides when to attach them, not the model. Good for context you want available but not acted on.

**Prompts.** Reusable templates the user picks, often surfaced as slash commands. Underused, but handy for "summarize this repo in our house style" type workflows.

Rule of thumb: if the model should decide, make it a tool. If the user or app should decide, make it a resource or prompt.

## Transports

**stdio.** The host launches your server as a local subprocess and talks over stdin and stdout. Zero network setup, no auth needed beyond the local user, easy to debug. Best for local dev tools and anything touching the local filesystem. One gotcha: anything your server prints to stdout that is not protocol traffic corrupts the stream. Send logs to stderr.

**Streamable HTTP.** The server runs as a web service. The client sends JSON-RPC over HTTP POST, and the server can stream responses back. This replaced the older HTTP plus server-sent events transport in the March 2025 spec revision. Use it for remote, multi-user or hosted servers. It brings the usual web concerns: auth, rate limits, session handling. See [[auth-and-security]].

## Picking a shape

- **Local, single user, needs files or a CLI**: stdio.
- **Shared team service, SaaS integration, needs OAuth**: Streamable HTTP.
- **Both**: keep tool logic in a plain module and wrap it with two thin transport entry points. Most SDKs make this easy.

## Lifecycle details that bite

- Servers can send list-changed notifications when their tools change. Not every client reacts to them, so do not rely on dynamic tool lists for core features.
- Long-running tools should report progress or return a job ID to poll. Clients often time out after tens of seconds.
- The model only sees tool descriptions and results. Your server's internal state is invisible unless you return it.

## Related

How to test all of this: [[testing-mcp-servers]]. How to change schemas without breaking clients: [[versioning-and-schemas]].

## Sources

- Model Context Protocol specification (modelcontextprotocol.io)
- Anthropic, "Introducing the Model Context Protocol" (November 2024)
- JSON-RPC 2.0 specification (jsonrpc.org)
