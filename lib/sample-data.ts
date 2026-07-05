import fs from 'fs'
import path from 'path'
import { DemoFile } from './types'

const files = [
  'project-atlas-meeting.txt',
  'client-email.txt',
  'sprint-notes.txt',
  'risk-log.txt',
  'team-chat-summary.txt',
]

export function loadDemoFiles(): DemoFile[] {
  return files.map((fileName) => {
    const filePath = path.join(process.cwd(), 'data', fileName)
    let content = ''
    try {
        content = fs.readFileSync(filePath, 'utf-8')
    } catch (e) {
        console.error(`Failed to read file ${filePath}:`, e)
    }

    return {
      fileName,
      sourceType: fileName.includes('email')
        ? 'email'
        : fileName.includes('chat')
        ? 'chat'
        : fileName.includes('risk')
        ? 'risk-log'
        : 'document',
      project: 'Project Atlas',
      date: '2026-07-01',
      content,
    }
  })
}
