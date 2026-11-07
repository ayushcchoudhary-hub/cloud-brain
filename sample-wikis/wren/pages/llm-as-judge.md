# LLM as Judge

> Using a model to grade another model's output: when it works, the known biases, and how to calibrate a judge against human labels before trusting it.

## When a judge makes sense

Use a judge model for checks that code cannot do and that are too slow for humans at scale: faithfulness to retrieved context, tone, whether a required step was covered. Do not use it for things a regex or a schema check can handle. Judges cost money, add latency to the eval run, and have their own failure modes.

## Pointwise vs pairwise

**Pointwise.** The judge sees one output and returns a verdict. Good for regression testing, since each case gets a stable pass/fail.

**Pairwise.** The judge sees two outputs for the same input and picks the better one. More reliable for comparing two prompts or two models, because relative judgments are easier than absolute ones. Less useful for tracking a single system over time.

## Known biases

- **Position bias.** In pairwise mode, judges tend to favor one slot, often the first. Fix: run each pair twice with the order swapped and only count consistent wins.
- **Verbosity bias.** Longer answers get rated higher even when they are not better. Fix: state in the rubric that length is not a quality signal, and spot-check long winners.
- **Self-preference.** A model may rate its own outputs higher. Fix: use a different model family as judge where you can.
- **Rubric drift.** Vague criteria like "is it helpful" let the judge invent its own standard. Fix: narrow, observable criteria.

## Write narrow rubrics

Bad: "Rate the answer quality from 1 to 10."

Better: "Does every factual claim in the answer appear in the provided context? Answer PASS or FAIL, then quote the first unsupported claim if FAIL."

Rules of thumb:

- One criterion per judge. Five criteria in one rubric produce mush.
- Binary or 3-level outputs. Fine-grained scales are noisy.
- Ask for a short reason before the verdict. It improves consistency and makes failures debuggable.
- Include 2 or 3 labeled examples of pass and fail in the judge instructions.

## Calibrate before you trust

A judge is a classifier. Treat it like one.

1. Have a human label 100 to 200 outputs for the criterion.
2. Run the judge on the same outputs.
3. Compute agreement. Cohen's kappa above 0.6 is a reasonable bar for a regression check. Below 0.4, the judge is close to useless.
4. Look at disagreements. Usually the rubric is ambiguous, not the judge.
5. Re-check agreement every time you change the judge model or rubric.

Also track true positive and true negative rates separately. A judge that passes everything has high agreement on a dataset that is 90 percent passes, and catches nothing.

## Cost control

- Use a smaller model for high-volume, simple criteria. Save larger models for subtle ones.
- Cache verdicts keyed by input, output and rubric version.
- Sample: judging 200 random production outputs a day is often enough.

## Where it fits

Judges are layer 2 in the stack described in [[eval-strategy-overview]]. For RAG faithfulness specifically, pair judge scores with retrieval metrics from [[rag-retrieval-metrics]] so you know which half failed. Judges also grade agent trajectories, see [[evaluating-tool-use-agents]].

## Sources

- Zheng et al., "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena" (2023)
- Notes from 4 sessions
