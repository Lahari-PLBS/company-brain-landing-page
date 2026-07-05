export type DemoFile = {
  fileName: string
  sourceType: string
  project: string
  date: string
  content: string
}

export type Chunk = {
  chunkId: string
  fileName: string
  sourceType: string
  project: string
  date: string
  text: string
}

export type AskResponse = {
  answer: string
  sources: {
    fileName: string
    project: string
    snippet: string
  }[]
  insights: {
    decisions: string[]
    pending_tasks: string[]
    risks: string[]
    missing_documentation: string[]
    duplicate_work: string[]
  }
}
