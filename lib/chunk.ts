import { Chunk, DemoFile } from './types'

export function chunkFiles(files: DemoFile[]): Chunk[] {
  const chunks: Chunk[] = []

  files.forEach((file) => {
    const isTabular = file.sourceType === 'csv' || file.sourceType === 'spreadsheet';
    const lines = file.content.split(/\n/).map(p => p.trim()).filter(Boolean);
    
    if (lines.length === 0) return;

    const header = isTabular ? lines[0] : "";
    const dataLines = isTabular ? lines.slice(1) : lines;

    const maxChunkSize = 1500;
    let currentPart = header ? header + "\n" : "";
    const parts = [];

    for (const line of dataLines) {
      if (currentPart.length + line.length > maxChunkSize && currentPart.length > (header ? header.length + 1 : 0)) {
        parts.push(currentPart);
        currentPart = header ? header + "\n" : "";
      }
      currentPart += (currentPart.endsWith("\n") || currentPart === "" ? "" : "\n") + line;
    }
    if (currentPart && currentPart !== (header ? header + "\n" : "")) {
      parts.push(currentPart);
    }

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
