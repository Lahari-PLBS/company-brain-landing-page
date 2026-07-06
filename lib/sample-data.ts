import fs from 'fs/promises'
import path from 'path'
import { DemoFile } from './types'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'

let cachedDemoFiles: DemoFile[] | null = null

export async function loadDemoFiles(): Promise<DemoFile[]> {
  const sampleDataDir = path.join(process.cwd(), 'public', 'sample-data')
  let files: string[] = []
  
  try {
    files = await fs.readdir(sampleDataDir)
  } catch (e) {
    console.error(`Failed to read sample-data directory:`, e)
    return []
  }

  const demoFiles: DemoFile[] = []

  for (const fileName of files) {
    const filePath = path.join(sampleDataDir, fileName)
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    let content = ''
    let sourceType = 'document'
    
    try {
      const buffer = await fs.readFile(filePath)
      
      if (extension === 'docx') {
        const result = await mammoth.extractRawText({ buffer })
        content = result.value
        sourceType = 'docx'
      } else if (extension === 'xlsx' || extension === 'csv') {
        const workbook = xlsx.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        content = xlsx.utils.sheet_to_txt(worksheet)
        sourceType = extension === 'csv' ? 'csv' : 'spreadsheet'
      } else if (extension === 'txt') {
        content = buffer.toString('utf-8')
        sourceType = 'txt'
      } else {
        content = buffer.toString('utf-8')
      }

      demoFiles.push({
        fileName,
        sourceType,
        project: 'Hospital Demo',
        date: new Date().toISOString().split('T')[0],
        content: content.trim(),
      })
    } catch (e) {
      console.error(`Failed to process file ${fileName}:`, e)
    }
  }

  return demoFiles
}
