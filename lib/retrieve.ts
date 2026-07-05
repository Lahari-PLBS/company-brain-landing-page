import { Chunk } from './types'

function scoreChunk(question: string, text: string) {
  const qWords = question.toLowerCase().split(/\W+/).filter(Boolean)
  const tWords = text.toLowerCase()
  return qWords.reduce((score, word) => {
    return score + (tWords.includes(word) ? 1 : 0)
  }, 0)
}

export function retrieveTopChunks(question: string, chunks: Chunk[], topK = 5) {
  return [...chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(question, chunk.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk)
}
