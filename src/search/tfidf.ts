import { tokensWithBigrams } from "./tokenize.js";

export interface IndexedDoc {
  id: string;
  title: string;
  topics: string[];
  body: string;
}

type SparseVector = Map<string, number>;

/** Field weights: a term in the title counts 3x, in topics 2x, in the body 1x. */
const FIELD_WEIGHTS = { title: 3, topics: 2, body: 1 } as const;

function termCounts(doc: IndexedDoc): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const term of tokensWithBigrams(text)) counts.set(term, (counts.get(term) ?? 0) + weight);
  };
  add(doc.title, FIELD_WEIGHTS.title);
  add(doc.topics.join(" "), FIELD_WEIGHTS.topics);
  add(doc.body, FIELD_WEIGHTS.body);
  return counts;
}

function normalize(vector: SparseVector): SparseVector {
  let norm = 0;
  for (const value of vector.values()) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm === 0) return vector;
  for (const [term, value] of vector) vector.set(term, value / norm);
  return vector;
}

/**
 * Keyless semantic-ish search: TF-IDF with sublinear term frequency, unigrams + bigrams,
 * cosine similarity. Scores are in 0..1. Good enough to tell "RAG metrics" from
 * "espresso water" on small wikis; it does not understand synonyms.
 */
export class TfIdfIndex {
  private counts = new Map<string, Map<string, number>>();
  private vectors = new Map<string, SparseVector>();
  private idf = new Map<string, number>();
  private dirty = false;

  get size(): number {
    return this.counts.size;
  }

  upsert(doc: IndexedDoc): void {
    this.counts.set(doc.id, termCounts(doc));
    this.dirty = true;
  }

  remove(id: string): void {
    this.dirty = this.counts.delete(id) || this.dirty;
  }

  private rebuild(): void {
    const n = this.counts.size;
    const df = new Map<string, number>();
    for (const counts of this.counts.values()) {
      for (const term of counts.keys()) df.set(term, (df.get(term) ?? 0) + 1);
    }
    this.idf = new Map([...df].map(([term, d]) => [term, Math.log((n + 1) / (d + 1)) + 1]));
    this.vectors = new Map();
    for (const [id, counts] of this.counts) {
      const vector: SparseVector = new Map();
      for (const [term, tf] of counts) vector.set(term, (1 + Math.log(tf)) * (this.idf.get(term) ?? 0));
      this.vectors.set(id, normalize(vector));
    }
    this.dirty = false;
  }

  /** Best matches first. Terms never seen in the corpus are ignored. */
  query(text: string, limit = 10): Array<{ id: string; score: number }> {
    if (this.dirty) this.rebuild();
    const tf = new Map<string, number>();
    for (const term of tokensWithBigrams(text)) {
      if (this.idf.has(term)) tf.set(term, (tf.get(term) ?? 0) + 1);
    }
    const queryVector = normalize(
      new Map([...tf].map(([term, count]) => [term, (1 + Math.log(count)) * (this.idf.get(term) ?? 0)]))
    );
    if (queryVector.size === 0) return [];

    const scored: Array<{ id: string; score: number }> = [];
    for (const [id, vector] of this.vectors) {
      let dot = 0;
      for (const [term, weight] of queryVector) dot += weight * (vector.get(term) ?? 0);
      if (dot > 0) scored.push({ id, score: Number(dot.toFixed(4)) });
    }
    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
