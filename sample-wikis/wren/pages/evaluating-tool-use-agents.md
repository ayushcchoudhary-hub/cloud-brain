# Evaluating Tool-Use Agents

> How to test agents that pick and use tools: tool selection accuracy, argument correctness, end-state checks, and why you need repeated runs.

## Why agents need different evals

A chat answer is one output. An agent run is a sequence: read the task, choose a tool, fill in arguments, read the result, decide what next. A run can reach the right final answer by luck after six wasted steps, or fail on step two because it chose a search tool when it needed a lookup tool. Final-answer grading alone misses both.

## What to measure

**Tool selection accuracy.** For each step where the right tool is clear, did the agent choose it? Build a small set of single-step prompts, maybe 50 to 100, each labeled with the expected tool. This is the cheapest agent eval and catches most problems caused by unclear tool names or overlapping tool descriptions.

**Argument correctness.** Given the right tool, were the arguments valid and sensible? Check schema validity in code. Check semantic correctness (right date range, right customer ID) against labels.

**End-state checks.** For tasks that change something, inspect the resulting state rather than the transcript. Was the ticket created with the right fields? Is the file content correct? End-state checks are robust to the agent taking a different but valid path.

**Trajectory efficiency.** Number of steps, tokens and wall time per task. Track the median and the 90th percentile. A prompt change that holds accuracy but doubles steps is a regression.

**Recovery.** Inject a tool error or an empty result and check the agent retries sensibly or tells the user, instead of looping or making things up.

## Run each task more than once

Agents are stochastic. A task that passes once may fail one time in three. Two useful views:

- **pass@k**: did at least one of k runs succeed? Measures capability.
- **pass^k** (all k succeed): measures reliability. This is what users feel.

For a production agent, pass^3 or pass^5 on your core tasks is a more honest number than a single run. Expect it to be well below single-run pass rate at first.

## Common failure patterns

- **Overlapping tools.** Two tools with similar descriptions, such as search_docs and find_documents, produce coin-flip selection. Merge them or sharpen the descriptions.
- **Too many tools.** Selection accuracy tends to drop as the tool count grows past roughly 20 to 30 in one context. Group or filter tools by task.
- **Huge tool results.** A tool that returns 40,000 tokens of raw JSON crowds out the task. The agent forgets the goal. Truncate and paginate on the tool side.
- **Silent errors.** A tool that returns an empty list on failure looks like "no results". Return explicit error messages the model can act on.

## Building the task set

Follow the same rules as [[golden-datasets]]: real tasks first, stratified by difficulty, versioned. For each task store the starting state, the instruction and a check function for the end state. Sandbox anything with side effects.

## Grading trajectories

Code checks handle selection and arguments. For judgment calls, such as "was asking the user for clarification reasonable here", use a judge model with a narrow rubric, calibrated as described in [[llm-as-judge]].

Related: [[eval-strategy-overview]].

## Sources

- Yao et al., "tau-bench: A Benchmark for Tool-Agent-User Interaction in Real-World Domains" (2024)
- Notes from 7 sessions
