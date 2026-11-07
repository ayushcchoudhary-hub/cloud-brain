# Testing MCP Servers

> A layered test plan for MCP servers: protocol contract tests, tool unit tests, manual checks in the Inspector, and model-in-the-loop checks that the right tool gets chosen.

## Three things can break

1. **The protocol layer.** Initialize fails, a schema is invalid, a transport hangs.
2. **The tool logic.** The tool does the wrong thing with valid input.
3. **The model fit.** The tool works, but models pick the wrong one or fill arguments badly.

Most teams test only the second. The first and third cause most of the support pain.

## Layer 1: contract tests

Run a real client against your server in CI and assert:

- Initialize succeeds and reports the expected capabilities.
- tools/list returns every tool with a valid JSON Schema.
- Each tool accepts a minimal valid input and rejects an obviously invalid one with a readable error.
- The server shuts down cleanly when the client disconnects.

For stdio servers, also assert that nothing except protocol messages reaches stdout. A stray debug print is a classic way to break every client at once.

## Layer 2: tool unit tests

Keep tool logic in plain functions with no protocol code, then test them like any other code. Mock downstream APIs. Cover pagination edges, empty results, timeouts and permission errors. Check that error messages say what went wrong and how to fix it, as described in [[tool-design-patterns]].

## Layer 3: manual checks with the Inspector

The MCP Inspector is a small web UI that connects to your server and lets you list tools, call them with hand-written arguments and see raw responses. Use it while building and before every release. It is the fastest way to see what the model will actually see, including how long results are.

## Layer 4: model-in-the-loop checks

This is the layer that tells you whether the tools are usable.

**Selection set.** Write 30 to 100 short user requests, each labeled with the tool that should be used. Run them through a real model with your server attached. Measure how often the right tool is picked first. Re-run after every change to names or descriptions.

**Argument checks.** For the same requests, assert the arguments are valid and sensible, such as the right date range or the right repo.

**Task runs.** A handful of multi-step tasks with a checkable end state. Run each several times, since results vary between runs.

Tips:

- Run against at least two models if your server will be used across clients.
- Track step count and result size alongside pass rate.
- Add every bug report as a new case.

## Security cases

Include tests for the risks in [[auth-and-security]]: expired and wrong-audience tokens, paths outside allowed directories, and tool results that contain injected instructions. Check that write tools still require the expected confirmation.

## Release gate

Before shipping a tool change: contract tests green, unit tests green, selection set within 2 points of the previous release, and a manual pass in the Inspector. Schema changes also follow [[versioning-and-schemas]].

Background: [[mcp-architecture-basics]].

## Sources

- MCP Inspector (github.com/modelcontextprotocol/inspector)
- Model Context Protocol specification (modelcontextprotocol.io)
- Notes from 6 sessions
