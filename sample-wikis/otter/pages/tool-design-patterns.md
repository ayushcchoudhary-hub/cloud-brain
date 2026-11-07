# Tool Design Patterns

> How to design MCP tools that models choose correctly and use well: naming, descriptions, granularity, response size, and error messages that help the model recover.

## The model is the user

Your tool's audience is a model reading a name, a description and a schema, with no docs site and no chance to ask questions. Write for that reader. Most bad agent behavior traces back to a tool that was clear to its author and vague to the model.

## Names

- Use verb_noun: search_issues, get_issue, create_issue.
- Prefix by service when a host may load several servers: github_search_issues vs jira_search_issues. Name collisions across servers cause wrong picks.
- Avoid near-synonyms in the same server. find_docs and search_docs side by side is a coin flip.

## Descriptions

A good description answers four things in 2 to 5 sentences:

1. What it does.
2. When to use it, and when to use a different tool instead.
3. What the important arguments mean, with formats (ISO date, cents vs dollars).
4. What it returns, roughly.

Example: "Search open and closed issues by keyword. Use get_issue instead if you already have an issue number. Dates are YYYY-MM-DD. Returns up to 20 matches with id, title and status; use the cursor to page."

Small description edits often move selection accuracy more than any other change. Test them, see [[testing-mcp-servers]].

## Granularity: fewer, higher-level tools

Wrapping every REST endpoint as a tool is the most common anti-pattern. A 60-tool server floods the context and makes selection harder. Instead, design around tasks:

- One schedule_meeting tool that checks availability and books, instead of list_calendars, get_free_busy and create_event.
- One search tool with filters, instead of five search variants.

A useful target is under 15 to 20 tools per server. If you need more, split by audience or let the user enable tool groups.

## Response size

Large results eat the context window and bury the useful part. Some clients cap tool output by default, so oversized results get cut off where you did not choose.

- Return the fields the model needs, not the raw API payload. Drop internal IDs, timestamps nobody asked for, nested metadata.
- Paginate with a cursor and a sensible default page size, often 10 to 25 items.
- Offer a detail level argument, such as concise vs full, so the model can ask for more only when needed.
- Prefer human-readable names over opaque IDs where possible. Models reason better with "Q3 roadmap" than "doc_8f3a".

## Errors that teach

An error is a prompt. "400 Bad Request" teaches nothing. "start_date must be before end_date; you sent start 12 March, end 2 March" lets the model fix it next turn. Return tool errors as results with a clear flag, not as protocol-level failures, so the model sees them.

## Read vs write

Mark tools that change state clearly in the name and description. Keep destructive actions (delete, send, pay) as separate tools so the host can require user confirmation for them. More in [[auth-and-security]].

## Related

Protocol background: [[mcp-architecture-basics]]. Changing tools safely after launch: [[versioning-and-schemas]].

## Sources

- Anthropic, "Writing effective tools for agents" (engineering blog, 2025)
- Model Context Protocol specification, tools section (modelcontextprotocol.io)
- Notes from 5 sessions
