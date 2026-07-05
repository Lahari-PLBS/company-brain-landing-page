'use client'

import { useState } from 'react'
import Link from 'next/link'

const sampleQuestions = [
  'What happened in Project Atlas?',
  'What decisions were taken?',
  'Show pending tasks.',
  'What are the current risks?',
  'Is any work being duplicated?',
]

export default function DashboardPage() {
  const [files, setFiles] = useState<any[]>([])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingAnswer, setLoadingAnswer] = useState(false)

  const [error, setError] = useState<string | null>(null)

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
        body: JSON.stringify({ question: finalQuestion }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong')
      }
      setResult(data)
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
            <h1 className="text-3xl font-bold">Company Brain Demo</h1>
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

        <section className="rounded-2xl bg-[#F9F9F9] p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
          <h2 className="text-xl font-semibold mb-3">Loaded Sources</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {files.map((file) => (
              <div key={file.fileName} className="rounded-xl bg-white p-4">
                <p className="font-semibold">{file.fileName}</p>
                <p className="text-sm text-[#83799E]">{file.sourceType} · {file.project}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)] space-y-4">
          <h2 className="text-xl font-semibold">Ask Company Brain</h2>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask what happened in Project Atlas..."
            className="min-h-[120px] w-full rounded-xl border border-gray-200 p-4 outline-none"
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
            {loadingAnswer ? 'Thinking...' : 'Ask Company Brain'}
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
              <div className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
                <h3 className="text-lg font-semibold mb-3">Answer</h3>
                <p className="text-[#1A0B54] whitespace-pre-line">{result.answer}</p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-[0_3px_9.1px_rgba(63,74,126,0.05),0_1px_29px_rgba(63,74,126,0.10)]">
                <h3 className="text-lg font-semibold mb-3">Source Snippets</h3>
                <div className="space-y-3">
                  {result.sources?.map((source: any, idx: number) => (
                    <div key={idx} className="rounded-xl bg-[#F9F9F9] p-4">
                      <p className="font-semibold">{source.fileName}</p>
                      <p className="text-sm text-[#83799E] mb-2">{source.project}</p>
                      <p className="text-sm text-[#1A0B54]">{source.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
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
