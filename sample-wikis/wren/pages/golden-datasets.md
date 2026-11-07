# Golden Datasets

> How to build, size and maintain the labeled test set behind your evals, including when synthetic data helps and when it misleads.

## What a golden set is

A golden set is a fixed list of inputs with known good outcomes. For RAG, each row is a query plus the IDs of relevant chunks and, optionally, a reference answer. For an agent, each row is a task plus the expected end state. It is the thing every other metric is computed against, so its quality caps the quality of your evals.

## How big

- **50 cases**: enough to catch big regressions and to start. Not enough to trust differences under 10 points.
- **100 to 300 cases**: the useful range for most apps. A 5-point change starts to mean something.
- **1,000+ cases**: only worth it for high-traffic systems or when you compare many close variants.

Rough guide: with 200 binary cases, the 95 percent margin of error on a pass rate near 80 percent is about plus or minus 5.5 points. Do not celebrate a 2-point gain on that set.

## Where cases come from

1. **Production logs.** The best source. Real phrasing, real ambiguity. Strip personal data before storing.
2. **Failure reports.** Every bug a user reports becomes a test case. This is how the set stays relevant.
3. **Domain experts.** Ask support or ops staff for the 20 questions they see most and the 10 that trip people up.
4. **Synthetic generation.** Have a model write questions from your documents. Fast, but see the caveats below.

## Stratify on purpose

A random sample of logs over-represents easy, common queries. Deliberately include:

- Questions where the right answer is "not in the docs".
- Multi-hop questions that need two chunks.
- Queries with typos, abbreviations or internal jargon.
- Recent content, since stale indexes are a common silent failure.

Tag each case with its category so you can report pass rate per slice. A blended 85 percent can hide a 40 percent pass rate on "not in the docs".

## Synthetic data: useful but biased

Generated questions tend to reuse the exact wording of the source chunk. Retrieval then looks great because the query and the chunk share vocabulary. Real users paraphrase. Mitigations:

- Ask the generator to paraphrase and to avoid copying phrases.
- Mix in at least 30 to 50 percent real queries.
- Have a human review a sample of generated cases and drop weak ones.

## Labeling

- Write labeling guidelines before labeling. Even one page helps.
- Double-label 10 to 20 percent of cases to measure agreement between labelers.
- Record who labeled what and when.

## Maintenance

- Store the set in version control as JSONL or CSV, not in a notebook.
- Review additions in PRs like code.
- Re-check labels when the underlying docs change. A correct answer last quarter can be wrong now.
- Keep a frozen holdout of about 20 percent that you never tune against.

## Related

Metric definitions live in [[rag-retrieval-metrics]]. Agent task sets have extra requirements, covered in [[evaluating-tool-use-agents]]. Overall approach: [[eval-strategy-overview]].

## Sources

- Notes from 5 sessions
