# RAG Retrieval Metrics

> Which numbers to track for the retrieval half of a RAG system, how to compute them on a small labeled set, and what usually moves them.

## Measure retrieval on its own

A RAG answer can fail in two places: the retriever never returned the right passage, or the model had it and still answered badly. Mixing the two hides the cause. Evaluate retrieval first, using a labeled set of queries where you know which documents or chunks are relevant. Building that set is covered in [[golden-datasets]].

## The core metrics

**Recall@k.** Of the relevant chunks for a query, what share appear in the top k results? This is the metric that matters most for RAG, because the model only sees the top k. If recall@5 is 0.6, then 40 percent of the time the answer is simply not in context.

**Hit rate@k.** Did at least one relevant chunk appear in the top k? Simpler than recall and fine when each query has a single gold chunk.

**MRR (mean reciprocal rank).** Average of 1 divided by the rank of the first relevant result. Rewards putting the best chunk first. Useful if you pass few chunks or if the model leans on the first one.

**nDCG@k.** Handles graded relevance and penalizes good results that sit low in the list. Worth it once you have graded labels.

**Precision@k.** Share of returned chunks that are relevant. Matters more than people think: irrelevant chunks dilute context and can pull the model off course.

## Typical starting numbers

On a fresh internal-docs RAG with default chunking and a general embedding model, recall@5 often lands between 0.5 and 0.7. Teams usually get it to 0.8 or above with a few changes rather than a new model.

## What usually moves recall

- **Chunk size.** 200 to 500 tokens with 10 to 20 percent overlap is a sane default. Very large chunks lower precision. Very small chunks split answers across boundaries.
- **Hybrid search.** Combining keyword search (BM25) with embeddings fixes misses on exact terms like product codes, error strings and names. Often the single biggest win.
- **Reranking.** Retrieve 20 to 50 candidates, then rerank with a cross-encoder down to 5. Adds latency, often 100 to 300 ms, but lifts precision a lot.
- **Query rewriting.** Expanding short or vague queries before search helps conversational apps where the user says "what about the second one".
- **Metadata filters.** Date, product or region filters remove whole classes of wrong hits.

## Position still matters

Even with good recall, models can underuse passages placed in the middle of a long context. Put the strongest chunks first or last, and keep k modest.

## Generation metrics, briefly

Once retrieval is solid, check generation on cases where the gold chunk was present: is the answer faithful to context, does it cite correctly, does it say "I don't know" when context is missing? Faithfulness is usually graded by a judge model, see [[llm-as-judge]].

## Pitfalls

- Labeling only one relevant chunk when several exist makes recall look worse than it is.
- Evaluating on queries written by the same person who wrote the docs inflates scores. Use real user queries when you can.
- Tuning on the full set and reporting on it too. Hold out 20 percent.

Related: [[eval-strategy-overview]].

## Sources

- Liu et al., "Lost in the Middle: How Language Models Use Long Contexts" (2023)
- Thakur et al., "BEIR: A Heterogeneous Benchmark for Zero-shot Evaluation of Information Retrieval Models" (2021)
- Ragas documentation (docs.ragas.io)
