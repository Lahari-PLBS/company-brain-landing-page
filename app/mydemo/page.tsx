'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  Users, UserCheck, Package, DollarSign, Calendar, 
  FileText, MessageSquare, Shield, ChevronDown, ChevronRight, 
  Send, RefreshCw, AlertCircle, Sparkles, Upload, Eye, Trash2,
  ArrowLeft, CheckCircle2, Globe, HelpCircle, Layers, MessageCircle
} from 'lucide-react'

type TempFile = {
  id: string
  fileName: string
  content: string
  sourceType: string
  category: string
  rawFile: File
}

type Message = {
  role: 'user' | 'ai'
  content: string
  sources?: any[]
}

type InsightData = {
  summary?: string
  decisions?: string[]
  pending_tasks?: string[]
  risks?: string[]
  missing_documentation?: string[]
  important_highlights?: string[]
}

const categories = [
  { name: 'Staff', emoji: '👥', color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { name: 'Customers / Clients', emoji: '👤', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { name: 'Inventory', emoji: '📦', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  { name: 'Finance', emoji: '💰', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  { name: 'Meetings', emoji: '📅', color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { name: 'Daily Reports', emoji: '📋', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  { name: 'Communications', emoji: '💬', color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { name: 'Policies', emoji: '📄', color: 'text-teal-600 bg-teal-50 border-teal-100' },
]

function renderBulletItem(item: any) {
  if (typeof item === 'object' && item !== null) {
    const textVal = item.highlight || item.text || item.decision || item.task || item.risk || item.description || item.val || JSON.stringify(item);
    return (
      <span>
        {textVal}
        {item.date && <span className="text-gray-400 ml-1.5 font-normal">({item.date})</span>}
        {item.assignee && <span className="text-gray-400 ml-1.5 font-normal">- Assignee: {item.assignee}</span>}
      </span>
    );
  }
  return <span>{String(item)}</span>;
}

function renderSummary(summary: any) {
  if (typeof summary === 'object' && summary !== null) {
    return (
      <div className="space-y-1.5 mt-1">
        {Object.entries(summary).map(([key, val]) => (
          <div key={key} className="text-xs text-gray-700 leading-relaxed font-medium">
            <strong className="capitalize font-bold text-gray-900">{key.replace(/_/g, ' ')}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-gray-700 leading-relaxed font-medium">{String(summary)}</p>;
}

export default function MyDemoPage() {
  const [files, setFiles] = useState<TempFile[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string>('All Documents')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Finance']))
  
  // Cache for summaries & loading states
  const [summaries, setSummaries] = useState<Record<string, InsightData>>({})
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({})
  
  // Chat history per category
  const [chats, setChats] = useState<Record<string, Message[]>>({})
  
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, selectedCategory])

  // Lazy load summaries on category selection or file changes
  useEffect(() => {
    const categoryFiles = selectedCategory === 'All Documents'
      ? files
      : files.filter(f => f.category === selectedCategory)

    if (categoryFiles.length > 0 && !summaries[selectedCategory] && !loadingSummaries[selectedCategory]) {
      fetchCategorySummary(selectedCategory)
    } else if (categoryFiles.length === 0 && summaries[selectedCategory]) {
      // Clear summary if no files exist in category
      setSummaries(prev => {
        const copy = { ...prev }
        delete copy[selectedCategory]
        return copy
      })
    }
  }, [selectedCategory, files, summaries])

  const invalidateCache = (catName: string) => {
    setSummaries(prev => {
      const copy = { ...prev }
      delete copy[catName]
      delete copy['All Documents']
      return copy
    })
  }

  async function fetchCategorySummary(categoryName: string) {
    if (loadingSummaries[categoryName]) return
    
    setLoadingSummaries(prev => ({ ...prev, [categoryName]: true }))
    setUploadError(null)

    const categoryFiles = categoryName === 'All Documents'
      ? files
      : files.filter(f => f.category === categoryName)

    const payloadFiles = categoryFiles.map(f => ({
      fileName: f.fileName,
      content: f.content,
      sourceType: f.sourceType,
      category: f.category,
      project: 'Demo Upload'
    }))

    try {
      const res = await fetch('/api/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'demo', 
          category: categoryName,
          files: payloadFiles 
        }),
      })

      if (!res.ok) throw new Error('Failed to fetch summary')
      const data = await res.json()
      setSummaries(prev => ({ ...prev, [categoryName]: data.insights }))
    } catch (e: any) {
      console.error(e)
      setSummaries(prev => ({
        ...prev,
        [categoryName]: {
          summary: 'Unable to generate summary at this time.',
          decisions: [],
          pending_tasks: [],
          risks: [],
          missing_documentation: [],
          important_highlights: []
        }
      }))
    } finally {
      setLoadingSummaries(prev => ({ ...prev, [categoryName]: false }))
    }
  }

  const toggleCategoryExpand = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation() // prevent category selection change if only expanding accordion
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(catName)) {
      newExpanded.delete(catName)
    } else {
      newExpanded.add(catName)
    }
    setExpandedCategories(newExpanded)
  }

  const toggleFileSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedFileIds)
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId)
    } else {
      newSelected.add(fileId)
    }
    setSelectedFileIds(newSelected)
  }

  const handleDeleteFile = (fileId: string, catName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFiles(prev => prev.filter(f => f.id !== fileId))
    
    const newSelected = new Set(selectedFileIds)
    newSelected.delete(fileId)
    setSelectedFileIds(newSelected)

    invalidateCache(catName)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, catName: string) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    setUploadingCategory(catName)
    setUploadError(null)

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await fetch('/api/demo-upload', {
          method: 'POST',
          body: formData
        })

        if (res.ok) {
          const data = await res.json()
          setFiles(prev => [
            ...prev,
            {
              id: Math.random().toString(36).substr(2, 9),
              fileName: data.fileName,
              content: data.content,
              sourceType: data.sourceType,
              category: catName,
              rawFile: file
            }
          ])
          invalidateCache(catName)
        } else {
          const data = await res.json().catch(() => ({}))
          setUploadError(data.error || `Failed to upload ${file.name}`)
        }
      } catch (err: any) {
        setUploadError(`Error uploading ${file.name}: ${err.message || err}`)
      }
    }

    setUploadingCategory(null)
    if (fileInputsRef.current[catName]) {
      fileInputsRef.current[catName]!.value = ''
    }
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const categoryFiles = selectedCategory === 'All Documents'
      ? files
      : files.filter(f => f.category === selectedCategory)

    if (!question.trim() || categoryFiles.length === 0 || isAsking) return

    const currentQuestion = question
    setQuestion('')
    
    setChats(prev => {
      const currentCategoryChat = prev[selectedCategory] || []
      return {
        ...prev,
        [selectedCategory]: [
          ...currentCategoryChat,
          { role: 'user', content: currentQuestion },
          { role: 'ai', content: '', sources: [] }
        ]
      }
    })
    setIsAsking(true)
    setUploadError(null)

    // Scope query context to selected checkbox files or all category files
    const activeScopedFiles = selectedFileIds.size > 0
      ? files.filter(f => selectedFileIds.has(f.id))
      : categoryFiles

    const payloadFiles = activeScopedFiles.map(f => ({
      fileName: f.fileName,
      content: f.content,
      sourceType: f.sourceType,
      project: 'Demo Upload'
    }))

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          mode: 'demo',
          files: payloadFiles
        })
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

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
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
                setChats(prev => {
                  const currentCategoryChat = [...(prev[selectedCategory] || [])]
                  if (currentCategoryChat.length === 0) return prev
                  
                  const lastMsg = { ...currentCategoryChat[currentCategoryChat.length - 1] }
                  
                  if (parsed.type === 'text') {
                    lastMsg.content += parsed.data
                  } else if (parsed.type === 'sources') {
                    lastMsg.sources = parsed.data
                  }
                  
                  currentCategoryChat[currentCategoryChat.length - 1] = lastMsg
                  return { ...prev, [selectedCategory]: currentCategoryChat }
                })
              } catch (e) {
                console.error('Error parsing SSE data', e)
              }
            }
          }
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to complete query request')
      setChats(prev => {
        const currentCategoryChat = [...(prev[selectedCategory] || [])]
        if (currentCategoryChat.length > 0) {
          currentCategoryChat[currentCategoryChat.length - 1].content = `Error: ${err.message || 'Something went wrong.'}`
        }
        return { ...prev, [selectedCategory]: currentCategoryChat }
      })
    } finally {
      setIsAsking(false)
    }
  }

  // Count files per category
  const fileCounts: Record<string, number> = {}
  categories.forEach(cat => {
    fileCounts[cat.name] = 0
  })
  files.forEach(file => {
    if (fileCounts[file.category] !== undefined) {
      fileCounts[file.category]++
    }
  })
  fileCounts['All Documents'] = files.length

  const filesByCategory = (catName: string) => files.filter(f => f.category === catName)
  const isSelectedFiles = (catName: string) => filesByCategory(catName).some(f => selectedFileIds.has(f.id))
  
  const currentCategoryFiles = selectedCategory === 'All Documents'
    ? files
    : files.filter(f => f.category === selectedCategory)

  const activeSummary = summaries[selectedCategory]
  const isActiveSummaryLoading = loadingSummaries[selectedCategory]
  const activeChat = chats[selectedCategory] || []

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-hidden h-screen">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 shrink-0 shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-brand-blue via-brand-purple to-brand-orange">
                Guest Upload Demo
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold tracking-wide">🔒 SESSION-ONLY IN-MEMORY</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full border border-orange-200">
            Guest Sandbox
          </span>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Pane 1 (Left): Collapsible sidebar categories with upload picker */}
        <section className="w-1/4 min-w-[200px] max-w-[280px] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 shrink-0">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand-purple" />
              Upload Hub
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white">
            
            {/* All Documents item */}
            <button
              onClick={() => setSelectedCategory('All Documents')}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all font-semibold text-xs border ${
                selectedCategory === 'All Documents'
                  ? 'bg-blue-50/70 border-blue-100 text-brand-blue shadow-sm'
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <span>All Documents</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedCategory === 'All Documents' ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {files.length}
              </span>
            </button>

            <div className="h-px bg-gray-100 my-2"></div>

            {categories.map(cat => {
              const isSelected = selectedCategory === cat.name
              const isExpanded = expandedCategories.has(cat.name)
              const catFiles = filesByCategory(cat.name)
              const count = catFiles.length
              const isUploadingCat = uploadingCategory === cat.name

              return (
                <div key={cat.name} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  {/* Category Header Selector */}
                  <div
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex items-center justify-between p-3 cursor-pointer select-none text-xs font-semibold transition-colors border-b border-transparent ${
                      isSelected 
                        ? 'bg-blue-50/40 text-brand-blue border-blue-50' 
                        : 'text-gray-700 hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">{cat.emoji}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => toggleCategoryExpand(cat.name, e)}>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {count}
                      </span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Expanded document actions list */}
                  {isExpanded && (
                    <div className="p-2 bg-white space-y-2">
                      {catFiles.length > 0 && (
                        <div className="space-y-1">
                          {catFiles.map(file => {
                            const isChecked = selectedFileIds.has(file.id)
                            return (
                              <div
                                key={file.id}
                                onClick={(e) => toggleFileSelection(file.id, e)}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all text-left ${
                                  isChecked 
                                    ? 'border-brand-blue bg-blue-50/30' 
                                    : 'border-transparent hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-800 break-all leading-tight">
                                      {file.fileName}
                                    </p>
                                    <p className="text-[8px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">
                                      {file.sourceType}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      const fileURL = URL.createObjectURL(file.rawFile)
                                      window.open(fileURL, '_blank')
                                    }}
                                    className="p-1 text-gray-400 hover:text-brand-blue rounded-md hover:bg-gray-100"
                                    title="View Original"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteFile(file.id, cat.name, e)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* File upload clicker */}
                      <div>
                        <input 
                          type="file"
                          ref={el => { fileInputsRef.current[cat.name] = el }}
                          onChange={(e) => handleFileUpload(e, cat.name)}
                          className="hidden"
                          accept=".txt,.pdf,.docx,.csv,.xlsx,.xls"
                        />
                        <button
                          onClick={() => fileInputsRef.current[cat.name]?.click()}
                          disabled={uploadingCategory !== null}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-[10px] text-gray-500 hover:text-brand-purple hover:border-brand-purple transition-all bg-gray-50/50 font-bold disabled:opacity-50"
                        >
                          {isUploadingCat ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin text-brand-purple" />
                              Parsing...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3 h-3" />
                              Upload
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Pane 2 (Middle): Summary Panel */}
        <section className="w-[38%] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 shrink-0 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-purple" />
              {selectedCategory} Summary
            </h2>
            {currentCategoryFiles.length > 0 && (
              <button 
                onClick={() => fetchCategorySummary(selectedCategory)}
                disabled={isActiveSummaryLoading}
                className="p-1.5 text-gray-500 hover:text-brand-purple rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Regenerate Summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isActiveSummaryLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-white">
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span className="font-semibold">{uploadError}</span>
              </div>
            )}

            {currentCategoryFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 py-20 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-brand-purple" />
                </div>
                <h3 className="font-bold text-sm text-gray-700 mb-1">No files in {selectedCategory}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Upload a document under `{selectedCategory}` on the left to automatically compile overview summaries and highlights.
                </p>
              </div>
            ) : isActiveSummaryLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-brand-purple" />
                <p className="text-xs font-semibold text-gray-500">AI is compiling {selectedCategory} insights...</p>
              </div>
            ) : !activeSummary ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <Sparkles className="w-8 h-8 mb-2 text-brand-purple opacity-30 animate-pulse" />
                <p className="text-xs font-semibold">Compiling overview data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Executive Summary */}
                {activeSummary.summary && (
                  <div className="bg-gradient-to-br from-purple-50/50 to-indigo-50/30 p-4 border border-indigo-100/50 rounded-2xl shadow-sm">
                    <h3 className="font-bold text-xs text-brand-purple uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Summary
                    </h3>
                    {renderSummary(activeSummary.summary)}
                  </div>
                )}

                {/* Important Highlights */}
                {Array.isArray(activeSummary.important_highlights) && activeSummary.important_highlights.length > 0 && (
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-gray-900 mb-2">📊 Key Highlights</h4>
                    <ul className="space-y-2">
                      {activeSummary.important_highlights.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand-purple font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions Made */}
                {Array.isArray(activeSummary.decisions) && activeSummary.decisions.length > 0 && (
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-green-800 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      Decisions Made
                    </h4>
                    <ul className="space-y-2">
                      {activeSummary.decisions.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-green-500 font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pending Tasks */}
                {Array.isArray(activeSummary.pending_tasks) && activeSummary.pending_tasks.length > 0 && (
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-brand-purple mb-2">📋 Pending Tasks</h4>
                    <ul className="space-y-2">
                      {activeSummary.pending_tasks.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand-purple font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {Array.isArray(activeSummary.risks) && activeSummary.risks.length > 0 && (
                  <div className="bg-red-50/30 border border-red-100/50 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-red-700 mb-2">⚠️ Risks & Warnings</h4>
                    <ul className="space-y-2">
                      {activeSummary.risks.map((item, i) => (
                        <li key={i} className="text-xs text-red-600 flex items-start gap-2 leading-relaxed font-medium">
                          <span className="text-red-400 font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Documentation */}
                {Array.isArray(activeSummary.missing_documentation) && activeSummary.missing_documentation.length > 0 && (
                  <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <h4 className="font-bold text-xs text-gray-800 mb-2 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      Missing Documentation
                    </h4>
                    <ul className="space-y-2">
                      {activeSummary.missing_documentation.map((item, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2 leading-relaxed">
                          <span className="text-gray-400 font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Pane 3 (Right): Chat Panel */}
        <section className="w-[38%] bg-white border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 shrink-0 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-orange" />
              AI Chat
            </h2>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              Scoped to {selectedCategory}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {currentCategoryFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="font-bold text-sm text-gray-700 mb-1">No documents in {selectedCategory}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  You must upload at least one document under the `{selectedCategory}` category on the left to start chatting with the AI.
                </p>
              </div>
            ) : activeChat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-brand-orange" />
                </div>
                <h3 className="font-bold text-sm text-gray-700 mb-1">Chat Scoped to {selectedCategory}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ask a question to search across the {currentCategoryFiles.length} file(s) uploaded under `{selectedCategory}`.
                </p>
              </div>
            ) : (
              activeChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`max-w-[90%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[#1A0B54] text-white rounded-br-none font-medium' 
                        : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-100 font-medium'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none break-words whitespace-pre-line" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Array.from(new Set(msg.sources.map((s: any) => s.fileName))).map((fileName: any, sIdx: number) => (
                        <span 
                          key={sIdx} 
                          className="inline-flex items-center gap-1 text-[9px] bg-gray-50 border border-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold shadow-sm"
                        >
                          <FileText className="w-2.5 h-2.5 text-brand-purple" />
                          {fileName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {isAsking && (
              <div className="flex items-start">
                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none px-4 py-2.5 border border-gray-100 shadow-sm flex items-center gap-2 text-xs font-semibold text-gray-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-purple" />
                  AlphaAssistant is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-3 border-t border-gray-200 bg-white shrink-0">
            <form onSubmit={handleAsk} className="relative flex items-center">
              <input
                type="text"
                placeholder={currentCategoryFiles.length === 0 ? "Upload documents first to start asking..." : `Ask a question about ${selectedCategory}...`}
                className="w-full bg-gray-50 border border-gray-200 rounded-full pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue disabled:opacity-50 disabled:bg-gray-100 font-medium"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={currentCategoryFiles.length === 0 || isAsking}
              />
              <button
                type="submit"
                disabled={!question.trim() || currentCategoryFiles.length === 0 || isAsking}
                className="absolute right-1.5 p-2 rounded-full bg-[#1A0B54] text-white hover:bg-[#2c1585] disabled:opacity-50 transition-colors flex items-center justify-center shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

      </main>
    </div>
  )
}
