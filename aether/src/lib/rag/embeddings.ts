import { logger } from '../logger';

export const EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || '384', 10);

let localPipeline: any = null;

async function getLocalPipeline() {
  if (!localPipeline) {
    try {
      const { pipeline } = await import('@xenova/transformers');
      localPipeline = await pipeline('feature-extraction', process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2');
    } catch (err) {
      logger.warn({ err }, 'Could not load @xenova/transformers, using deterministic mock embedding');
    }
  }
  return localPipeline;
}

/**
 * Computes an embedding vector for a given text using zero-cost free providers
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase().trim();

  // 1. Ollama free local embedding
  if (provider === 'ollama') {
    try {
      const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1').replace('/v1', '');
      const model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';

      const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.embedding)) {
          return data.embedding;
        }
      }
    } catch (err) {
      logger.warn({ err }, 'Ollama embedding failed, falling back to local');
    }
  }

  // 2. Transformers.js free local embedding (all-MiniLM-L6-v2, 384 dims)
  try {
    const pipe = await getLocalPipeline();
    if (pipe) {
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      return Array.from(output.data);
    }
  } catch (err) {
    logger.warn({ err }, 'Local transformer embedding error');
  }

  // 3. Fallback: Deterministic normalized vector of length EMBEDDING_DIM
  const vector = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    vector[i % EMBEDDING_DIM] += (charCode * (i + 1)) % 100;
  }
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * Computes cosine similarity between two float vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
