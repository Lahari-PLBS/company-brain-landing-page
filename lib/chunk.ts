import { Chunk, DemoFile } from './types'

export function chunkFiles(files: DemoFile[]): Chunk[] {
  const chunks: Chunk[] = []

  files.forEach((file) => {
    const parts = file.content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    parts.forEach((part, index) => {
      chunks.push({
        chunkId: `${file.fileName}-${index}`,
        fileName: file.fileName,
        sourceType: file.sourceType,
        project: file.project,
        date: file.date,
        text: part,
      })
    })
  })

  return chunks
}
