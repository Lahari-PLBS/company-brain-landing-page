import { Chunk } from './types'

const stopWords = new Set(['what', 'is', 'the', 'in', 'of', 'and', 'a', 'to', 'for', 'on', 'with', 'as', 'by', 'at', 'an', 'be', 'this', 'which', 'that', 'it', 'are', 'was', 'were', 'will', 's', 'how', 'much', 'show', 'summarize', 'who', 'has', 'did', 'does', 'do', 'can', 'could', 'would', 'should', 'have', 'had', 'from', 'about'])

const synonyms: Record<string, string[]> = {
  'revenue': ['rev_', 'credit', 'billing'],
  'expenses': ['exp_', 'debit', 'cost', 'ledger'],
  'monthly': ['january', 'february', 'march', 'month'],
  'electricity': ['elec', 'power', 'light', 'utility'],
  'food': ['catering', 'sysco', 'caf', 'meals', 'supplies'],
  'doctor': ['dr.', 'surgeon', 'payroll'],
  'salary': ['payroll'],
  'patient': ['inpatient', 'outpatient', 'discharge', 'feedback'],
  'bill': ['billing', 'charged', 'cost']
}

function scoreChunk(question: string, chunk: Chunk) {
  const baseWords = question.toLowerCase().split(/\W+/).filter(w => w && !stopWords.has(w))
  const qWords = [...baseWords]
  baseWords.forEach(w => {
    if (synonyms[w]) {
      qWords.push(...synonyms[w])
    }
  })

  const tWords = (chunk.fileName + ' ' + chunk.text).toLowerCase()
  
  return qWords.reduce((score, word) => {
    return score + (tWords.includes(word) ? 1 : 0)
  }, 0)
}

export function retrieveTopChunks(question: string, chunks: Chunk[], topK = 10) {
  return [...chunks]
    .map((chunk) => ({ chunk, score: scoreChunk(question, chunk) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((item) => item.chunk)
}
