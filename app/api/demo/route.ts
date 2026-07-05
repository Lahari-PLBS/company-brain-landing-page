import { NextResponse } from 'next/server'
import { loadDemoFiles } from '@/lib/sample-data'

export async function GET() {
  const files = loadDemoFiles()
  return NextResponse.json({ files })
}
