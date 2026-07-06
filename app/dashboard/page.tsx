'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { FileText, FileSpreadsheet, FileIcon, Eye } from 'lucide-react'

const sampleQuestions = [
  'What is the total hospital revenue?',
  'Which doctor has the highest salary?',
  'Show this month\'s electricity expenses.',
  'Which patient generated the highest bill?',
  'How much was spent on food supplies?',
  'Summarize the hospital\'s monthly expenses.',
]

export default function DashboardPage() {
  const [files, setFiles] = useState<any[]>([])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingAnswer, setLoadingAnswer] = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDemoWorkspace()
  }, [])

  async function loadDemoWorkspace() {
    setLoadingFiles(true)
    setError(null)
    try {
      const res = await fetch('/api/demo')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) {
      setError('Failed to load workspace files.')
    } finally {
      setLoadingFiles(false)
    }
  }

  async function askQuestion(customQuestion?: string) {
    const finalQuestion = customQuestion || question
    if (!finalQuestion) return

    setQuestion(finalQuestion)
    setLoadingAnswer(true)
    setError(null)
    setResult(null)
    
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: finalQuestion, mode: 'demo' }),
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong')
      }
      
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')
      
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''
      const streamedResult: any = { answer: '', sources: [], insights: {} }
      setResult({ ...streamedResult })

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          // keep the last part in buffer if it doesn't end with \n\n
          buffer = parts.pop() || ''
          
          for (const part of parts) {
            if (part.startsWith('data: ')) {
              const dataStr = part.slice(6)
              if (dataStr === '[DONE]') {
                done = true
                break
              }
              try {
                const parsed = JSON.parse(dataStr)
                if (parsed.type === 'text') {
                  streamedResult.answer += parsed.data
                } else if (parsed.type === 'sources') {
                  streamedResult.sources = parsed.data
                } else if (parsed.type === 'insights') {
                  streamedResult.insights = parsed.data
                } else if (parsed.type === 'error') {
                  setError(parsed.data)
                }
                setResult({ ...streamedResult })
              } catch (e) {
                console.error('Error parsing SSE data', e)
              }
            }
          }
        }
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingAnswer(false)
    }
  }

  return (
    <main className="min-h-screen bg-white text-[#1A0B54] p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold"><span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">Alpha Assistant</span> Demo</h1>
            <p className="text-[#83799E]">Search scattered company knowledge in one place.</p>
          </div>
          <Link href="/workspace" className="inline-flex">
            <button
              className="rounded-xl px-5 py-3 text-white shadow-md"
              style={{ background: 'linear-gradient(90deg, #2BA7FF, #CA45FF 50%, #FE881B)' }}
            >
              Load Your Workspace
            </button>
          </Link>
        </div>

        <section className="rounded-2xl bg-[#F9F9F9] p-6 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)] border border-gray-100">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-[#1A0B54]">Hospital Sample Knowledge Base</h2>
            <p className="text-[#83799E] mt-1 text-sm">Try the AI with Sample Hospital Data without uploading your own files.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => {
              const ext = file.fileName.split('.').pop()?.toLowerCase();
              let Icon = FileIcon;
              if (ext === 'csv' || ext === 'xlsx') Icon = FileSpreadsheet;
              if (ext === 'docx' || ext === 'txt') Icon = FileText;
              
              return (
                <div key={file.fileName} className="group relative flex flex-col justify-between rounded-xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                      <Icon size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-sm truncate" title={file.fileName}>{file.fileName}</p>
                      <p className="text-xs text-[#83799E] mt-0.5 uppercase tracking-wider font-medium">{ext}</p>
                    </div>
                  </div>
                  <Link href={`/sample-data/${file.fileName}`} target="_blank" className="mt-4 w-full">
                    <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-50 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                      <Eye size={16} />
                      View File
                    </button>
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)] space-y-4 border border-gray-100">
          <div>
            <h2 className="text-xl font-bold">Ask AI</h2>
            <p className="text-[#83799E] mt-1 text-sm bg-purple-50 p-3 rounded-lg border border-purple-100">
              These sample hospital documents have already been indexed by the AI. Ask questions naturally and the AI will answer using information from these files.
            </p>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What is the total hospital revenue?"
            className="min-h-[120px] w-full rounded-xl border border-gray-200 p-4 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-50 transition-all"
          />

          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((q) => (
              <button
                key={q}
                onClick={() => askQuestion(q)}
                className="rounded-full bg-[#F9F9F9] px-4 py-2 text-sm text-[#1A0B54]"
              >
                {q}
              </button>
            ))}
          </div>

          <button
            onClick={() => askQuestion()}
            className="rounded-xl bg-[#1A0B54] px-5 py-3 text-white"
          >
            {loadingAnswer ? 'Thinking...' : 'Ask AlphaAssistant'}
          </button>
        </section>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 border border-red-200">
            <p className="text-red-600 font-semibold">Error: {error}</p>
          </div>
        )}

        {result && (
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)] min-h-[100px]">
                <h3 className="text-lg font-semibold mb-3">Answer</h3>
                {loadingAnswer && !result.answer && (
                  <div className="flex items-center gap-2 text-[#83799E] animate-pulse">
                    <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-purple-400 rounded-full delay-75"></div>
                    <div className="h-2 w-2 bg-purple-400 rounded-full delay-150"></div>
                    <span className="ml-2 font-medium">Thinking...</span>
                  </div>
                )}
                <p className="text-[#1A0B54] whitespace-pre-line">{result.answer}</p>
              </div>

              {result.sources && result.sources.length > 0 && (
                <div className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
                  <h3 className="text-lg font-semibold mb-3">Source Files</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(result.sources.map((s: any) => s.fileName))).map((fileName: any, idx: number) => (
                      <div key={idx} className="rounded-xl bg-[#F9F9F9] px-4 py-2 border border-gray-100 flex items-center gap-2">
                        <FileText size={16} className="text-purple-600" />
                        <span className="font-medium text-sm text-[#1A0B54]">{fileName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {result.insights?.summary && (
                <div className="rounded-2xl bg-purple-50 p-5 border border-purple-100 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
                  <h3 className="text-lg font-semibold mb-3 text-purple-900">Executive Summary</h3>
                  <p className="text-sm text-purple-800">{result.insights.summary}</p>
                </div>
              )}
              {[
                ['Decisions', result.insights?.decisions || []],
                ['Pending Tasks', result.insights?.pending_tasks || []],
                ['Risks', result.insights?.risks || []],
                ['Missing Documentation', result.insights?.missing_documentation || []],
                ['Duplicate Work', result.insights?.duplicate_work || []],
              ].map(([title, items]: any) => (
                <div key={title} className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
                  <h3 className="text-lg font-semibold mb-3">{title}</h3>
                  <ul className="space-y-2 text-sm text-[#83799E]">
                    {items.length ? items.map((item: string, idx: number) => <li key={idx}>• {item}</li>) : <li>• None found</li>}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
