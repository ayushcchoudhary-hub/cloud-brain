# Eval Strategy Overview

> How to stand up evals for an LLM app: start from real failures, layer cheap checks under expensive ones, and keep a human in the loop for calibration.

## Why bother

Most LLM apps ship on vibes. Someone tries ten prompts, the answers look fine, and the change goes out. The problem shows up two weeks later when a prompt tweak fixes one case and quietly breaks five others. Evals are the regression suite that stops this. They do not need to be fancy. A spreadsheet of 50 real inputs with a pass/fail column beats a dashboard of generic scores nobody trusts.

## Start with error analysis, not metrics

The most common mistake is picking metrics before looking at data. Generic scores like "helpfulness" or "coherence" rarely line up with what actually breaks in your product.

A better order:

1. Pull 50 to 100 real traces from logs or dogfooding.
2. Read every one. Write a short free-text note on what went wrong, if anything.
3. Group the notes into failure modes. Expect 5 to 10 buckets, with 2 or 3 covering most of the failures.
4. Only now write checks, one per failure mode that matters.

This takes an afternoon. It usually reveals that the real problems are narrow and fixable, like the model inventing a refund policy or dropping the date filter in a search query.

## Three layers of checks

**Layer 1: code assertions.** Deterministic checks that run on every commit. Does the output parse as JSON? Is the cited document ID one we actually retrieved? Is the answer under 200 words? These are cheap, fast, and catch a surprising share of regressions. Aim for this layer to run in under a minute.

**Layer 2: model-graded checks.** An LLM judge scores outputs against a narrow rubric. Use this for things code cannot check, like "does the answer stay within the retrieved context". See [[llm-as-judge]] for how to keep judges honest. Run nightly or on PRs that touch prompts.

**Layer 3: human review.** A person labels a sample, maybe 20 to 50 outputs a week. This is the ground truth that keeps layers 1 and 2 calibrated. Skip it and your judge drifts without anyone noticing.

## What to measure for RAG

Split retrieval from generation. If the right chunk never reaches the model, no prompt fix will help. Measure retrieval with recall@k against a labeled set, then measure generation separately on cases where retrieval succeeded. Details in [[rag-retrieval-metrics]].

## Datasets

Your eval set is a product artifact. Version it, review changes to it, and grow it from production failures. A good starting size is 100 to 300 cases. See [[golden-datasets]].

## Agents and tools

Agent evals add a new dimension: the path matters, not just the final answer. Did the agent pick the right tool, with the right arguments, in a sensible number of steps? See [[evaluating-tool-use-agents]].

## Practical defaults

- Binary pass/fail beats 1 to 10 scales. Scores of 6 vs 7 carry little signal.
- Track pass rate per failure mode, not one blended number.
- Re-run the full suite before any model or prompt change ships.
- Budget roughly 10 to 20 percent of build time for eval upkeep.

## Sources

- Hamel Husain, "Your AI Product Needs Evals" (blog post, 2024)
- OpenAI Evals repository on GitHub
- Notes from 6 sessions
