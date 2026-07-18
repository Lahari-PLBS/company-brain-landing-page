'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChartRenderer, VisualizationData } from './chart-renderer'
import { 
  FileText, Trash2, Upload, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, FileQuestion, Copy, LogOut, ChevronDown, ChevronRight, 
  MessageSquare, Plus, MoreVertical, Eye, Globe, Sparkles, HelpCircle, 
  Layers, MessageCircle, Maximize2, X
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type FileItem = {
  id: string
  file_name: string
  source_type: string
  content: string
  category: string
  created_at: string
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
          <div key={key} className="text-xs text-gray-300 leading-relaxed font-medium">
            <strong className="capitalize font-bold text-white">{key.replace(/_/g, ' ')}:</strong> {typeof val === 'object' ? JSON.stringify(val) : String(val)}
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-xs text-gray-300 leading-relaxed font-medium">{String(summary)}</p>;
}

const getFileEmoji = (fileName: string, sourceType: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (sourceType === 'email' || ext === 'eml') return '📧';
  if (sourceType === 'spreadsheet' || sourceType === 'csv' || ext === 'xlsx' || ext === 'xls' || ext === 'csv') return '📊';
  return '📄';
};

function parseEmailContent(content: string) {
  const subjectMatch = content.match(/^Subject:\r?\n([^\n]*)/m) || content.match(/^Subject:\s*([^\n]*)/m);
  const fromMatch = content.match(/^From:\r?\n([^\n]*)/m) || content.match(/^From:\s*([^\n]*)/m);
  const toMatch = content.match(/^To:\r?\n([^\n]*)/m) || content.match(/^To:\s*([^\n]*)/m);
  const dateMatch = content.match(/^Date:\r?\n([^\n]*)/m) || content.match(/^Date:\s*([^\n]*)/m);
  
  const bodyIndex = content.indexOf('Body:\n');
  const bodyIndexWindows = content.indexOf('Body:\r\n');
  
  let body = '';
  if (bodyIndex !== -1) {
    body = content.substring(bodyIndex + 5).trim();
  } else if (bodyIndexWindows !== -1) {
    body = content.substring(bodyIndexWindows + 7).trim();
  } else {
    body = content;
  }
  
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : 'No Subject',
    from: fromMatch ? fromMatch[1].trim() : 'Unknown Sender',
    to: toMatch ? toMatch[1].trim() : '',
    date: dateMatch ? dateMatch[1].trim() : 'Unknown Date',
    body: body
  };
}

export function WorkspaceClient({ 
  user, 
  initialFiles 
}: { 
  user: any, 
  initialFiles: FileItem[] 
}) {
  const router = useRouter()
  const supabase = createClient()
  
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [files, setFiles] = useState<FileItem[]>(initialFiles)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Category layout states
  const [selectedCategory, setSelectedCategory] = useState<string>('All Documents')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Finance']))
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null)

  // Caching states
  const [summaries, setSummaries] = useState<Record<string, InsightData>>({})
  const [loadingSummaries, setLoadingSummaries] = useState<Record<string, boolean>>({})
  
  // Scoped chat message lists
  const [chats, setChats] = useState<Record<string, Message[]>>({})
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({})

  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const [expandedVisualization, setExpandedVisualization] = useState<VisualizationData | null>(null)

  // Load chat history & summary on mount for default category
  useEffect(() => {
    fetchCategorySummary(selectedCategory)
    loadCategoryHistory(selectedCategory)
  }, [])

  // Listen for Escape key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExpandedVisualization(null)
        setDeleteCandidateId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Sync category changes
  useEffect(() => {
    if (!summaries[selectedCategory] && !loadingSummaries[selectedCategory]) {
      fetchCategorySummary(selectedCategory)
    }
    if (!chats[selectedCategory] && !loadingHistory[selectedCategory]) {
      loadCategoryHistory(selectedCategory)
    }
  }, [selectedCategory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, selectedCategory])

  const invalidateCache = (catName: string) => {
    setSummaries(prev => {
      const copy = { ...prev }
      delete copy[catName]
      delete copy['All Documents']
      return copy
    })
  }

  const loadCategoryHistory = async (categoryName: string) => {
    setLoadingHistory(prev => ({ ...prev, [categoryName]: true }))
    try {
      const res = await fetch(`/api/history?category=${encodeURIComponent(categoryName)}`)
      if (res.ok) {
        const data = await res.json()
        setChats(prev => ({ ...prev, [categoryName]: data.messages || [] }))
      }
    } catch (err) {
      console.error('Failed to load category history', err)
    } finally {
      setLoadingHistory(prev => ({ ...prev, [categoryName]: false }))
    }
  }

  const fetchCategorySummary = async (categoryName: string, force = false) => {
    if (loadingSummaries[categoryName] && !force) return
    setLoadingSummaries(prev => ({ ...prev, [categoryName]: true }))
    setUploadError(null)

    try {
      const res = await fetch('/api/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          mode: 'workspace', 
          category: categoryName 
        })
      })

      if (!res.ok) throw new Error('Failed to load overview')
      const data = await res.json()
      setSummaries(prev => ({ ...prev, [categoryName]: data.insights }))
    } catch (err: any) {
      console.error(err)
      setSummaries(prev => ({
        ...prev,
        [categoryName]: {
          summary: 'Unable to compile overview details at this time.',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, catName: string) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    setIsUploading(true)
    setUploadingCategory(catName)
    setUploadError(null)
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', catName)
      
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (res.ok) {
          const { data } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            
          if (data) setFiles(data)
          invalidateCache(catName)
        } else {
          const data = await res.json().catch(() => ({}))
          setUploadError(data.error || `Failed to upload ${file.name}.`)
        }
      } catch (error: any) {
        setUploadError(`Failed to upload ${file.name}: ${error.message || error}`)
      }
    }
    
    setIsUploading(false)
    setUploadingCategory(null)
    if (fileInputsRef.current[catName]) {
      fileInputsRef.current[catName]!.value = ''
    }
  }

  const handleDeleteFile = async (id: string, catName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to permanently delete this file?')) return
    setUploadError(null)

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setFiles(prev => prev.filter(f => f.id !== id))
      setSelectedFileIds(prev => {
        const copy = new Set(prev)
        copy.delete(id)
        return copy
      })

      invalidateCache(catName)
    } catch (err: any) {
      setUploadError(`Failed to delete document: ${err.message || err}`)
    }
  }

  const handleDeleteQuery = (queryId: string) => {
    setDeleteCandidateId(queryId)
  }

  const confirmDeleteQuery = async () => {
    if (!deleteCandidateId) return
    const queryId = deleteCandidateId
    setDeleteCandidateId(null)

    const previousChat = chats[selectedCategory] || []

    // Optimistic UI update: filter out messages with this id
    setChats(prev => {
      const currentCategoryChat = prev[selectedCategory] || []
      const filtered = currentCategoryChat.filter(msg => msg.id !== queryId)
      return { ...prev, [selectedCategory]: filtered }
    })

    try {
      const res = await fetch(`/api/history?id=${queryId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete from storage')
      }
    } catch (err: any) {
      console.error('Delete chat error:', err)
      setUploadError(err.message || 'Failed to persist chat deletion')
      setChats(prev => ({ ...prev, [selectedCategory]: previousChat }))
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

    // Build payload context
    const activeScopedFileIds = selectedFileIds.size > 0
      ? Array.from(selectedFileIds)
      : categoryFiles.map(f => f.id)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          mode: 'workspace',
          category: selectedCategory,
          fileIds: activeScopedFileIds
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
                  } else if (parsed.type === 'visualization') {
                    lastMsg.visualization = parsed.data
                  } else if (parsed.type === 'query_id') {
                    const queryId = parsed.data
                    if (currentCategoryChat.length >= 2) {
                      currentCategoryChat[currentCategoryChat.length - 2].id = queryId
                    }
                    lastMsg.id = queryId
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
      setUploadError(err.message || 'Failed to complete message request')
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

  const toggleCategoryExpand = (catName: string, e: React.MouseEvent) => {
    e.stopPropagation()
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

  // Group files by category
  const filesByCategory: Record<string, FileItem[]> = {}
  categories.forEach(cat => {
    filesByCategory[cat.name] = []
  })
  files.forEach(file => {
    const cat = file.category || 'Policies'
    if (filesByCategory[cat]) {
      filesByCategory[cat].push(file)
    } else {
      filesByCategory['Policies'].push(file)
    }
  })

  // Count files per category
  const fileCounts: Record<string, number> = {}
  categories.forEach(cat => {
    fileCounts[cat.name] = filesByCategory[cat.name]?.length || 0
  })
  fileCounts['All Documents'] = files.length

  const currentCategoryFiles = selectedCategory === 'All Documents'
    ? files
    : filesByCategory[selectedCategory] || []

  const activeSummary = summaries[selectedCategory]
  const isActiveSummaryLoading = loadingSummaries[selectedCategory]
  const activeChat = chats[selectedCategory] || []
  const isChatLoading = loadingHistory[selectedCategory]

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col font-sans overflow-hidden h-screen relative z-10">
      {/* Top Header */}
      <header className="bg-[#0B1220]/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10 shadow-lg shadow-black/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-brand-blue via-brand-purple to-brand-orange rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400 font-semibold tracking-wide uppercase">My Workspace</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs text-gray-300 font-semibold bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-[160px]">
              {user.email}
            </span>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 bg-white/5 border border-white/10 rounded-xl hover:bg-red-950/20 transition-all duration-200 shadow-md shadow-black/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto p-4 md:p-6 gap-6">
        
        {/* Pane 1 (Left): Collapsible categories listing */}
        <section className="w-1/4 min-w-[200px] max-w-[280px] bg-[#1A2235]/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-blue-500/5">
          <div className="p-4 border-b border-white/5 bg-[#111827]/40 shrink-0">
            <h2 className="font-extrabold text-white text-sm flex items-center gap-2 tracking-tight">
              <Layers className="w-4 h-4 text-brand-blue" />
              Categories
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-transparent">
            
            {/* All Documents selector */}
            <button
              onClick={() => setSelectedCategory('All Documents')}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-all font-semibold text-xs border ${
                selectedCategory === 'All Documents'
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-lg shadow-blue-500/5'
                  : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🌐</span>
                <span>All Documents</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                selectedCategory === 'All Documents' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white/5 text-gray-400'
              }`}>
                {files.length}
              </span>
            </button>

            <div className="h-px bg-white/5 my-2"></div>

            {categories.map(cat => {
              const isSelected = selectedCategory === cat.name
              const isExpanded = expandedCategories.has(cat.name)
              const catFiles = filesByCategory[cat.name] || []
              const count = catFiles.length
              const isUploadingCat = uploadingCategory === cat.name

              return (
                <div key={cat.name} className="border border-white/5 rounded-xl overflow-hidden shadow-md bg-[#111827]/40">
                  {/* Category Header Selector */}
                  <div
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`flex items-center justify-between p-3 cursor-pointer select-none text-xs font-semibold transition-colors border-b border-transparent ${
                      isSelected 
                        ? 'bg-blue-500/10 text-blue-400 border-white/5' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base flex-shrink-0">{cat.emoji}</span>
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5" onClick={(e) => toggleCategoryExpand(cat.name, e)}>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white/5 text-gray-400'
                      }`}>
                        {count}
                      </span>
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </div>
                  </div>

                  {/* Accordion File list */}
                  {isExpanded && (
                    <div className="p-2 bg-[#1A2235]/25 space-y-2 border-t border-white/5">
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
                                    ? 'border-blue-500/40 bg-blue-500/10' 
                                    : 'border-transparent hover:bg-white/5'
                                }`}
                              >
                                <div className="flex items-start gap-2 min-w-0 flex-1">
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}}
                                    className="mt-0.5 h-3.5 w-3.5 rounded border-white/10 bg-white/5 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-gray-200 break-all leading-tight">
                                      {getFileEmoji(file.file_name, file.source_type)} {file.file_name}
                                    </p>
                                    <p className="text-[8px] text-gray-500 uppercase tracking-wider font-bold mt-0.5 font-sans">
                                      {file.source_type}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setPreviewFile(file)
                                    }}
                                    className="p-1 text-gray-500 hover:text-blue-400 rounded-md hover:bg-white/5"
                                    title="View Content"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteFile(file.id, cat.name, e)}
                                    className="p-1 text-gray-500 hover:text-red-400 rounded-md hover:bg-white/5"
                                    title="Delete File"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* File upload trigger */}
                      <div>
                        <input 
                          type="file"
                          ref={el => { fileInputsRef.current[cat.name] = el }}
                          onChange={(e) => handleFileUpload(e, cat.name)}
                          className="hidden"
                          accept=".txt,.pdf,.docx,.csv,.xlsx,.xls,.eml"
                        />

                        <button
                          onClick={() => fileInputsRef.current[cat.name]?.click()}
                          disabled={isUploading}
                          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 py-2 text-[10px] text-gray-400 hover:text-blue-400 hover:border-blue-500 transition-all bg-white/5 hover:bg-white/10 font-bold disabled:opacity-50"
                        >
                          {isUploadingCat ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
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

          <div className="p-3 bg-[#111827]/40 border-t border-white/5 text-[9px] text-gray-400 font-bold shrink-0">
            <p className="uppercase tracking-wider text-gray-500 mb-1">Supported Files</p>
            <div className="flex flex-wrap gap-1.5 font-sans">
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">PDF</span>
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">DOCX</span>
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">TXT</span>
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">CSV</span>
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">XLSX</span>
              <span className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">EML</span>
            </div>
          </div>
        </section>

        {/* Pane 2 (Middle): Summary Panel */}
        <section className="w-[38%] bg-[#1A2235]/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-blue-500/5">
          <div className="p-4 border-b border-white/5 bg-[#111827]/40 shrink-0 flex items-center justify-between">
            <h2 className="font-extrabold text-white text-sm flex items-center gap-2 tracking-tight">
              <FileText className="w-4 h-4 text-brand-purple" />
              {selectedCategory} Summary
            </h2>
            {currentCategoryFiles.length > 0 && (
              <button 
                onClick={() => fetchCategorySummary(selectedCategory, true)}
                disabled={isActiveSummaryLoading}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                title="Regenerate Summary"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isActiveSummaryLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent">
            {uploadError && (
              <div className="p-3 bg-red-950/40 border border-red-900/40 text-red-400 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span className="font-semibold">{uploadError}</span>
              </div>
            )}

            {currentCategoryFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 py-20 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-extrabold text-sm text-white mb-1 tracking-tight">No documents in {selectedCategory}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upload a document under `{selectedCategory}` on the left to permanently save it and generate summaries.
                </p>
              </div>
            ) : isActiveSummaryLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mb-3 text-brand-purple" />
                <p className="text-xs font-semibold text-gray-400">AI is compiling {selectedCategory} insights...</p>
              </div>
            ) : !activeSummary ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-center text-gray-400">
                <Sparkles className="w-8 h-8 mb-2 text-brand-purple opacity-30 animate-pulse" />
                <p className="text-xs font-semibold text-gray-400">Compiling overview data...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Executive Summary */}
                {activeSummary.summary && (
                  <div className="bg-gradient-to-br from-blue-950/20 to-indigo-950/15 p-4 border border-blue-900/35 rounded-2xl shadow-lg shadow-blue-500/5">
                    <h3 className="font-bold text-xs text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Executive Summary
                    </h3>
                    {renderSummary(activeSummary.summary)}
                  </div>
                )}

                {/* KPI Cards Grid */}
                {Array.isArray(activeSummary.kpi_cards) && activeSummary.kpi_cards.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {activeSummary.kpi_cards.map((card, i) => (
                      <div key={i} className="bg-[#111827]/40 border border-white/5 p-3 rounded-xl shadow-md flex flex-col justify-center min-w-0 glass-panel-hover">
                        <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider truncate">{card.title}</span>
                        <span className="text-base font-extrabold text-white mt-1 truncate tracking-tight">{card.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Important Highlights */}
                {Array.isArray(activeSummary.important_highlights) && activeSummary.important_highlights.length > 0 && (
                  <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold text-xs text-white mb-2">📊 Key Highlights</h4>
                    <ul className="space-y-2">
                      {activeSummary.important_highlights.map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand-purple font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Decisions Made */}
                {Array.isArray(activeSummary.decisions) && activeSummary.decisions.length > 0 && (
                  <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold text-xs text-green-400 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      Decisions Made
                    </h4>
                    <ul className="space-y-2">
                      {activeSummary.decisions.map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-green-400 font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pending Tasks */}
                {Array.isArray(activeSummary.pending_tasks) && activeSummary.pending_tasks.length > 0 && (
                  <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold text-xs text-brand-purple mb-2">📋 Pending Tasks</h4>
                    <ul className="space-y-2">
                      {activeSummary.pending_tasks.map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-brand-purple font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Risks */}
                {Array.isArray(activeSummary.risks) && activeSummary.risks.length > 0 && (
                  <div className="bg-red-950/20 border border-red-900/35 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold text-xs text-red-400 mb-2">⚠️ Risks & Warnings</h4>
                    <ul className="space-y-2">
                      {activeSummary.risks.map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed font-medium">
                          <span className="text-red-400 font-extrabold mt-0.5">•</span>
                          {renderBulletItem(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Documentation */}
                {Array.isArray(activeSummary.missing_documentation) && activeSummary.missing_documentation.length > 0 && (
                  <div className="bg-[#111827]/40 border border-white/5 p-4 rounded-xl shadow-md">
                    <h4 className="font-bold text-xs text-gray-300 mb-2 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      Missing Documentation
                    </h4>
                    <ul className="space-y-2">
                      {activeSummary.missing_documentation.map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
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
        <section className="w-[38%] bg-[#1A2235]/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-blue-500/5">
          <div className="p-4 border-b border-white/5 bg-[#111827]/40 shrink-0 flex items-center justify-between">
            <h2 className="font-extrabold text-white text-sm flex items-center gap-2 tracking-tight">
              <MessageSquare className="w-4 h-4 text-brand-orange" />
              AI Chat
            </h2>
            <span className="text-[10px] font-bold text-gray-400 bg-white/5 border border-white/5 px-2.5 py-1 rounded-full">
              Scoped to {selectedCategory}
            </span>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent">
            {currentCategoryFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-extrabold text-sm text-white mb-1 tracking-tight">No documents in {selectedCategory}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Upload files under `{selectedCategory}` on the left to start chatting about them persistently.
                </p>
              </div>
            ) : isChatLoading ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-gray-400">
                <RefreshCw className="w-6 h-6 mb-3 text-brand-orange animate-spin" />
                <p className="text-xs font-semibold text-gray-400">Loading conversation history...</p>
              </div>
            ) : activeChat.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 max-w-xs mx-auto">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6 text-orange-400" />
                </div>
                <h3 className="font-extrabold text-sm text-white mb-1 tracking-tight">Chat Scoped to {selectedCategory}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Ask a question to start a persistent conversation across the {currentCategoryFiles.length} file(s) in `{selectedCategory}`.
                </p>
              </div>
            ) : (
              activeChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 max-w-[90%] group relative">
                    {msg.role === 'user' && msg.id && (
                      <button
                        onClick={() => handleDeleteQuery(msg.id!)}
                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 focus:outline-none shrink-0"
                        title="Delete chat query"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div 
                      className={`rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-none font-medium shadow-md shadow-blue-500/10' 
                          : 'bg-white/5 text-gray-200 rounded-bl-none border border-white/5 font-medium'
                      }`}
                    >
                      <div className="prose prose-sm max-w-none break-words whitespace-pre-line" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                    </div>
                  </div>
                  {msg.role === 'ai' && msg.visualization && (
                    <div className="mt-2 w-full max-w-[90%] shrink-0 group/chart relative">
                      <ChartRenderer visualization={msg.visualization} />
                      <button
                        onClick={() => setExpandedVisualization(msg.visualization)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-[#111827]/80 hover:bg-[#111827] text-gray-400 hover:text-white border border-white/10 opacity-0 group-hover/chart:opacity-100 transition-all duration-200 shadow-md cursor-pointer flex items-center justify-center"
                        title="Expand visualization"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {Array.from(new Set(msg.sources.map((s: any) => s.fileName))).map((fileName: any, sIdx: number) => (
                        <span 
                          key={sIdx} 
                          className="inline-flex items-center gap-1 text-[9px] bg-white/5 border border-white/5 text-gray-400 px-2 py-0.5 rounded-full font-bold hover:bg-white/10 transition-colors shadow-md shadow-black/10 cursor-pointer"
                        >
                          <span className="text-[10px]">{getFileEmoji(fileName, '')}</span>
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
                <div className="bg-white/5 text-gray-300 rounded-2xl rounded-bl-none px-4 py-2.5 border border-white/5 shadow-md flex items-center gap-2 text-xs font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-orange" />
                  AlphaAssistant is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <div className="p-3 border-t border-white/5 bg-[#111827]/40 shrink-0">
            <form onSubmit={handleAsk} className="relative flex items-center">
              <input
                type="text"
                placeholder={currentCategoryFiles.length === 0 ? "Upload documents first to start asking..." : `Ask a question about ${selectedCategory}...`}
                className="w-full bg-white/5 border border-white/10 text-white placeholder-gray-500 rounded-full pl-4 pr-10 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent disabled:opacity-50 disabled:bg-white/5 font-medium transition-all duration-200"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={currentCategoryFiles.length === 0 || isAsking}
              />
              <button
                type="submit"
                disabled={!question.trim() || currentCategoryFiles.length === 0 || isAsking}
                className="absolute right-1.5 p-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-blue-500/10"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </section>

      </main>

      {/* Preview File Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1A2235] rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-white/5 bg-[#111827]/40 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight">{previewFile.file_name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">{previewFile.source_type} • {previewFile.category || 'Policies'}</p>
              </div>
              <button 
                onClick={() => setPreviewFile(null)} 
                className="text-gray-300 hover:text-white font-bold bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 transition-all duration-200 hover:bg-white/10 text-xs shadow-md shadow-black/10"
              >
                Close
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {previewFile.source_type === 'email' || previewFile.file_name.endsWith('.eml') ? (() => {
                const emailData = parseEmailContent(previewFile.content);
                return (
                  <div className="space-y-4">
                    <div className="border-b border-white/5 pb-4 space-y-2">
                      <div className="flex items-start">
                        <span className="w-16 font-bold text-xs text-gray-500 uppercase tracking-wider mt-0.5">Subject:</span>
                        <span className="text-white font-semibold text-sm">{emailData.subject}</span>
                      </div>
                      <div className="flex items-start">
                        <span className="w-16 font-bold text-xs text-gray-500 uppercase tracking-wider mt-0.5">From:</span>
                        <span className="text-gray-300 text-sm font-medium">{emailData.from}</span>
                      </div>
                      {emailData.to && (
                        <div className="flex items-start">
                          <span className="w-16 font-bold text-xs text-gray-500 uppercase tracking-wider mt-0.5">To:</span>
                          <span className="text-gray-300 text-sm font-medium">{emailData.to}</span>
                        </div>
                      )}
                      <div className="flex items-start">
                        <span className="w-16 font-bold text-xs text-gray-500 uppercase tracking-wider mt-0.5">Date:</span>
                        <span className="text-gray-300 text-sm font-medium">{emailData.date}</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                      {emailData.body}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                  {previewFile.content || "No content extracted."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1A2235] border border-white/10 rounded-2xl max-w-sm w-full p-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <h3 className="font-extrabold text-white text-base tracking-tight mb-2">Delete Conversation Pair?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 font-medium">
              This will permanently remove both the query and its corresponding AI response from your workspace history. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteQuery}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedVisualization && (
        <div 
          onClick={() => setExpandedVisualization(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0B1220] border border-white/10 rounded-2xl max-w-3xl w-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 bg-[#111827]/40 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-white text-base tracking-tight">{expandedVisualization.title || 'Data Visualization'}</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium uppercase tracking-wider">
                  Detailed view of {expandedVisualization.type} chart
                </p>
              </div>
              <button 
                onClick={() => setExpandedVisualization(null)} 
                className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all duration-200 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] flex items-center justify-center bg-[#111827]/10">
              <div className="w-full max-w-2xl bg-transparent">
                <ChartRenderer visualization={expandedVisualization} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
