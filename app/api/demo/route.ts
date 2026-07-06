import { NextResponse } from 'next/server'
import { loadDemoFiles } from '@/lib/sample-data'

export async function GET() {
  const files = await loadDemoFiles()
  return NextResponse.json({ files })
}
