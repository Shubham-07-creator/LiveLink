export interface TextChunk {
  chunkIndex: number;
  content: string;
  charCount: number;
  estimatedTokens: number;
}

/**
 * Splits text into 500-800 token chunks (approx 2000-3200 chars) with 100-token overlap
 */
export function chunkText(text: string, targetChunkTokens = 600, overlapTokens = 100): TextChunk[] {
  const targetChars = targetChunkTokens * 4;
  const overlapChars = overlapTokens * 4;

  if (text.length <= targetChars) {
    return [
      {
        chunkIndex: 0,
        content: text.trim(),
        charCount: text.trim().length,
        estimatedTokens: Math.ceil(text.trim().length / 4)
      }
    ];
  }

  const chunks: TextChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + targetChars;

    if (endIndex < text.length) {
      // Find clean paragraph or sentence break
      const slice = text.slice(startIndex, endIndex + 200);
      const paraBreak = slice.lastIndexOf('\n\n');
      const sentenceBreak = slice.lastIndexOf('. ');
      const newlineBreak = slice.lastIndexOf('\n');

      if (paraBreak > targetChars * 0.7) {
        endIndex = startIndex + paraBreak + 2;
      } else if (sentenceBreak > targetChars * 0.7) {
        endIndex = startIndex + sentenceBreak + 2;
      } else if (newlineBreak > targetChars * 0.7) {
        endIndex = startIndex + newlineBreak + 1;
      }
    } else {
      endIndex = text.length;
    }

    const chunkContent = text.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        chunkIndex,
        content: chunkContent,
        charCount: chunkContent.length,
        estimatedTokens: Math.ceil(chunkContent.length / 4)
      });
      chunkIndex++;
    }

    if (endIndex >= text.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - overlapChars);
  }

  return chunks;
}
