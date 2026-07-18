import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { parseEml } from '@/lib/eml-parser'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const fileName = file.name
    const extension = fileName.split('.').pop()?.toLowerCase()

    let content = ''
    let sourceType = 'document'

    if (extension === 'pdf') {
      const parser = new PDFParse({ data: buffer })
      const data = await parser.getText()
      content = data.text
      sourceType = 'pdf'
    } else if (extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer })
      content = result.value
      sourceType = 'docx'
    } else if (extension === 'doc') {
      return NextResponse.json(
        { error: 'Legacy .doc files are not supported. Please save as .docx and try again.' },
        { status: 400 }
      )
    } else if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      content = xlsx.utils.sheet_to_txt(worksheet)
      sourceType = extension === 'csv' ? 'csv' : 'spreadsheet'
    } else if (extension === 'txt') {
      content = buffer.toString('utf-8')
      sourceType = 'txt'
    } else if (extension === 'eml') {
      const emlContent = buffer.toString('utf-8')
      const parsedEmail = parseEml(emlContent)
      content = [
        `Subject:`,
        `${parsedEmail.subject}`,
        ``,
        `From:`,
        `${parsedEmail.from}`,
        ``,
        `To:`,
        `${parsedEmail.to}`,
        ``,
        `Date:`,
        `${parsedEmail.date}`,
        ``,
        `Body:`,
        `${parsedEmail.body}`
      ].join('\n')
      sourceType = 'email'
    } else {
      content = buffer.toString('utf-8')
      sourceType = 'document'
    }

    const cleanContent = content.trim()

    return NextResponse.json({
      fileName,
      content: cleanContent,
      sourceType,
      project: 'Demo Workspace',
      date: new Date().toISOString().split('T')[0]
    })
  } catch (error: any) {
    console.error('File parsing failed:', error)
    return NextResponse.json({ error: `File parsing failed: ${error.message}` }, { status: 500 })
  }
}
