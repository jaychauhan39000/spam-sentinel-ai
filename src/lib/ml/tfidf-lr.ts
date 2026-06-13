// Minimal TF-IDF + Logistic Regression classifier.
// Trains once at module load on the embedded dataset, then runs in-process for predictions.

import { TRAINING_DATA } from "./dataset";

const STOPWORDS = new Set([
  "a","an","the","is","are","was","were","be","been","being","am","i","me","my","mine","you","your","yours",
  "he","him","his","she","her","hers","it","its","we","us","our","ours","they","them","their","theirs",
  "and","or","but","if","then","else","when","at","by","for","with","about","against","between","into","through",
  "to","from","in","on","off","over","under","again","further","of","as","that","this","these","those","do","does",
  "did","have","has","had","not","no","so","such","than","too","very","can","will","just","also","there","here",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " URL ")
    .replace(/\b\d{4,}\b/g, " NUM ")
    .replace(/[^a-z0-9$£€!? ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface TrainedModel {
  vocab: Map<string, number>;
  idf: Float32Array;
  weights: Float32Array;
  bias: number;
}

function buildVocab(docs: string[][]): { vocab: Map<string, number>; idf: Float32Array } {
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set(doc);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  // Keep terms appearing in >=2 docs to limit noise
  const terms = Array.from(df.entries())
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1500)
    .map(([t]) => t);

  const vocab = new Map<string, number>();
  terms.forEach((t, i) => vocab.set(t, i));
  const N = docs.length;
  const idf = new Float32Array(terms.length);
  for (let i = 0; i < terms.length; i++) {
    idf[i] = Math.log((1 + N) / (1 + (df.get(terms[i]) ?? 1))) + 1;
  }
  return { vocab, idf };
}

function vectorize(tokens: string[], vocab: Map<string, number>, idf: Float32Array): Float32Array {
  const vec = new Float32Array(vocab.size);
  const tf = new Map<number, number>();
  for (const t of tokens) {
    const i = vocab.get(t);
    if (i === undefined) continue;
    tf.set(i, (tf.get(i) ?? 0) + 1);
  }
  if (tokens.length === 0) return vec;
  let norm = 0;
  for (const [i, c] of tf) {
    const v = (c / tokens.length) * idf[i];
    vec[i] = v;
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [i] of tf) vec[i] /= norm;
  return vec;
}

function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

function train(): TrainedModel {
  const tokensList = TRAINING_DATA.map((d) => tokenize(d.text));
  const { vocab, idf } = buildVocab(tokensList);
  const X = tokensList.map((toks) => vectorize(toks, vocab, idf));
  const y = TRAINING_DATA.map((d) => d.label);

  const weights = new Float32Array(vocab.size);
  let bias = 0;
  const lr = 0.5;
  const epochs = 250;
  const l2 = 0.001;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let n = 0; n < X.length; n++) {
      const x = X[n];
      let z = bias;
      for (let i = 0; i < weights.length; i++) z += weights[i] * x[i];
      const p = sigmoid(z);
      const err = p - y[n];
      for (let i = 0; i < weights.length; i++) {
        if (x[i] !== 0) {
          weights[i] -= lr * (err * x[i] + l2 * weights[i]);
        }
      }
      bias -= lr * err;
    }
  }

  return { vocab, idf, weights, bias };
}

let cached: TrainedModel | null = null;
function getModel(): TrainedModel {
  if (!cached) cached = train();
  return cached;
}

export interface MlResult {
  label: "Spam" | "Ham";
  probability: number; // probability of spam, 0-1
  keywords: string[];
}

export function classifyWithTfidfLr(message: string): MlResult {
  const model = getModel();
  const tokens = tokenize(message);
  const vec = vectorize(tokens, model.vocab, model.idf);

  let z = model.bias;
  const contributions: Array<{ term: string; score: number }> = [];
  const reverseVocab = new Map<number, string>();
  for (const [t, i] of model.vocab) reverseVocab.set(i, t);

  for (let i = 0; i < model.weights.length; i++) {
    if (vec[i] !== 0) {
      const contrib = model.weights[i] * vec[i];
      z += contrib;
      if (contrib > 0) {
        contributions.push({ term: reverseVocab.get(i)!, score: contrib });
      }
    }
  }

  const prob = sigmoid(z);
  const label: "Spam" | "Ham" = prob >= 0.5 ? "Spam" : "Ham";
  const keywords = contributions
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((c) => c.term)
    .filter((t) => t !== "url" && t !== "num");

  return { label, probability: prob, keywords };
}

// Eagerly warm the model in long-lived runtimes.
export function warmModel(): void {
  getModel();
}