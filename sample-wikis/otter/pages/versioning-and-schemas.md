# Versioning and Schemas

> How to evolve MCP tool schemas and server behavior after launch without breaking clients or confusing models that learned the old shape.

## Two kinds of version

**Protocol version.** Negotiated during initialize. The client proposes a version, the server answers with one it supports. Spec revisions are named by date. Your SDK usually handles this, but pin the SDK version and read the changelog before upgrading, since transport and auth details have changed between revisions.

**Your tool contract.** Names, descriptions, input schemas and result shapes. Nothing in the protocol versions these for you. This is where most breakage happens.

## Safe changes

- Adding a new optional input field with a sensible default.
- Adding fields to a result.
- Adding a new tool.
- Improving a description without changing behavior.

## Breaking changes

- Renaming or removing a tool.
- Renaming an input field or making an optional field required.
- Changing units or formats, such as dollars to cents or local time to UTC.
- Changing what a tool does under the same name.

Even "safe" changes can shift model behavior. A new optional field changes the schema the model reads, and a longer description can change which tool it picks. Re-run your selection set after any change, see [[testing-mcp-servers]].

## Patterns that work

**Additive first.** Add the new field or tool, keep the old one working, migrate, then remove. Same as any public API.

**Deprecate in the description.** Models read descriptions, so tell them: "Deprecated: use search_issues instead. This tool will be removed after June." Clients that show tool lists to users will surface it too.

**New name for new behavior.** If semantics change, ship search_issues_v2 or a better name, rather than mutating search_issues in place. Remove the old one after a notice period.

**Strict input validation.** Reject unknown fields with a clear error instead of silently dropping them. Silent drops hide client bugs and model mistakes.

**Stable result shapes.** Keep top-level keys stable. Put variable content inside a known container, for example an items list plus a next cursor.

## Schema style tips

- Use enums for fixed choices. Models fill enums far more reliably than free text.
- Give every field a description, including format and example.
- Keep nesting shallow. Deeply nested objects lead to malformed arguments.
- Avoid many optional booleans that interact. Prefer one mode enum.
- Put limits in the schema (minimum, maximum, maxLength) so invalid input fails fast.

## Communicating changes

- Keep a changelog in the repo, one line per tool change.
- Bump your server's own version string on every release and log it on startup.
- For hosted servers, announce removals ahead of time and keep usage logs so you know who still relies on the old shape.

## Related

Design principles that make change easier: [[tool-design-patterns]]. Protocol background: [[mcp-architecture-basics]]. Security implications of new tools: [[auth-and-security]].

## Sources

- Model Context Protocol specification, versioning and lifecycle sections (modelcontextprotocol.io)
- Notes from 3 sessions
