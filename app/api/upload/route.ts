import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import * as xlsx from 'xlsx'
import { createClient } from '@/lib/supabase/server'

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
    } else {
      content = buffer.toString('utf-8')
      sourceType = 'document'
    }

    const cleanContent = content.trim()

    // Save to database if authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && cleanContent) {
      const { error: dbError } = await supabase.from('files').insert({
        user_id: user.id,
        file_name: fileName,
        source_type: sourceType,
        content: cleanContent,
      })

      if (dbError) {
        console.error('Failed to save file to DB:', dbError)
        return NextResponse.json({ error: 'Failed to save file to database' }, { status: 500 })
      }
    }

    return NextResponse.json({
      fileName,
      content: cleanContent,
      sourceType,
      project: 'Personal Workspace',
      date: new Date().toISOString().split('T')[0]
    })
  } catch (error: any) {
    console.error('File parsing failed:', error)
    return NextResponse.json({ error: `File parsing failed: ${error.message}` }, { status: 500 })
  }
}
