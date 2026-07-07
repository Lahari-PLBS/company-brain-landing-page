'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Trash2, Upload, RefreshCw, Send, CheckCircle2, AlertTriangle, FileQuestion, Copy, LogOut, ChevronDown, ChevronRight, MessageSquare, Plus, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FileItem = {
  id: string
  file_name: string
  source_type: string
  created_at: string
}

type InsightData = {
  summary?: string
  decisions: string[]
  pending_tasks: string[]
  risks: string[]
  missing_documentation: string[]
  duplicate_work: string[]
}

type Message = {
  role: 'user' | 'ai'
  content: string
  sources?: any[]
  insights?: any
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [files, setFiles] = useState<FileItem[]>(initialFiles)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  
  const [overview, setOverview] = useState<InsightData | null>(null)
  const [isFetchingOverview, setIsFetchingOverview] = useState(false)
  
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Chat history state
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  
  // Accordion state
  const [isFilesExpanded, setIsFilesExpanded] = useState(true)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  // Fetch overview on mount if there are files and no active conversation
  useEffect(() => {
    if (files.length > 0 && !overview && messages.length === 0) {
      fetchOverview()
    }
  }, [files])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const loadConversation = async (id: string) => {
    if (activeConversationId === id) return
    setActiveConversationId(id)
    setIsAsking(true)
    try {
      const res = await fetch(`/api/history/${id}`)
      const data = await res.json()
      if (data.queries && data.queries.length > 0) {
        const loadedMessages: Message[] = []
        data.queries.forEach((q: any) => {
          loadedMessages.push({ role: 'user', content: q.question })
          loadedMessages.push({ role: 'ai', content: q.answer, sources: q.sources, insights: q.insights })
        })
        setMessages(loadedMessages)
        
        // Restore overview from the LAST query
        const lastQuery = data.queries[data.queries.length - 1]
        if (lastQuery.insights) {
          setOverview(lastQuery.insights)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsAsking(false)
    }
  }

  const startNewChat = () => {
    setActiveConversationId(null)
    setMessages([])
    setOverview(null)
    if (files.length > 0) {
      fetchOverview()
    }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return
    try {
      await fetch(`/api/history/${id}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== id))
      if (activeConversationId === id) {
        startNewChat()
      }
    } catch(err) {
      console.error(err)
    }
    setActiveMenuId(null)
  }

  const fetchOverview = async () => {
    setIsFetchingOverview(true)
    try {
      const res = await fetch('/api/overview')
      const data = await res.json()
      if (data.insights) {
        setOverview(data.insights)
      }
    } catch (error) {
      console.error('Failed to fetch overview', error)
    } finally {
      setIsFetchingOverview(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    setIsUploading(true)
    
    // Process each file
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i]
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        
        if (res.ok) {
          // Re-fetch files from DB
          const { data } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            
          if (data) setFiles(data)
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}`, error)
      }
    }
    
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    fetchOverview() // Refresh overview after upload
  }

  const handleDeleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const { error } = await supabase.from('files').delete().eq('id', id)
    if (!error) {
      setFiles(files.filter(f => f.id !== id))
      const newSelected = new Set(selectedFileIds)
      newSelected.delete(id)
      setSelectedFileIds(newSelected)
      fetchOverview()
    }
  }

  const toggleFileSelection = (id: string) => {
    const newSelected = new Set(selectedFileIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedFileIds(newSelected)
  }

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || files.length === 0) return

    const currentQuestion = question
    setQuestion('')
    setMessages(prev => [...prev, { role: 'user', content: currentQuestion }, { role: 'ai', content: '', sources: [], insights: {} }])
    setIsAsking(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: currentQuestion,
          fileIds: Array.from(selectedFileIds),
          conversationId: activeConversationId
        })
      })
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1].content = `Error: ${data.error || 'Something went wrong'}`
          return newMessages
        })
        return
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
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMsg = { ...newMessages[newMessages.length - 1] }
                  if (parsed.type === 'text') {
                    lastMsg.content += parsed.data
                  } else if (parsed.type === 'sources') {
                    lastMsg.sources = parsed.data
                  } else if (parsed.type === 'insights') {
                    lastMsg.insights = parsed.data
                    setOverview(parsed.data) // live update overview
                  } else if (parsed.type === 'error') {
                    lastMsg.content += `\n\nError: ${parsed.data}`
                  } else if (parsed.type === 'conversation_id') {
                    if (!activeConversationId) {
                      setActiveConversationId(parsed.data)
                      fetchHistory() // refresh sidebar immediately
                    }
                  }
                  newMessages[newMessages.length - 1] = lastMsg
                  return newMessages
                })
              } catch (e) {
                console.error('Error parsing SSE data', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].content = 'Sorry, something went wrong.'
        return newMessages
      })
    } finally {
      setIsAsking(false)
    }
  }

  const hasInsights = overview && (
    (overview.summary) ||
    (overview.decisions && overview.decisions.length > 0) ||
    (overview.pending_tasks && overview.pending_tasks.length > 0) ||
    (overview.risks && overview.risks.length > 0) ||
    (overview.missing_documentation && overview.missing_documentation.length > 0)
  )

  const categorizeConversations = () => {
    const today = new Date()
    today.setHours(0,0,0,0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const last7 = new Date(today)
    last7.setDate(last7.getDate() - 7)

    const groups = {
      Today: [] as any[],
      Yesterday: [] as any[],
      'Last 7 Days': [] as any[],
      Older: [] as any[]
    }

    conversations.forEach(c => {
      const d = new Date(c.updatedAt)
      if (d >= today) groups.Today.push(c)
      else if (d >= yesterday) groups.Yesterday.push(c)
      else if (d >= last7) groups['Last 7 Days'].push(c)
      else groups.Older.push(c)
    })
    return groups
  }

  const groupedConvos = categorizeConversations()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Workspace</h1>
            <p className="text-sm text-gray-500">Manage knowledge and ask questions across your files</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => fetchOverview()}
              disabled={isFetchingOverview || files.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingOverview ? 'animate-spin' : ''}`} />
              Refresh Overview
            </button>
            
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                multiple 
                accept=".txt,.pdf,.doc,.docx,.csv,.xlsx,.xls"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-md hover:bg-brand-blue/90 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
            
            <div className="w-px h-6 bg-gray-200 mx-1"></div>
            
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-gray-200 rounded-md hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-[calc(100vh-120px)] sticky top-[90px]">
          
          {/* Documents Section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
            <div 
              className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsFilesExpanded(!isFilesExpanded)}
            >
              <div className="flex items-center gap-2">
                {isFilesExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <h2 className="font-semibold text-gray-800">Documents</h2>
              </div>
              <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                {files.length}
              </span>
            </div>
            
            {isFilesExpanded && (
              <>
                <div className="p-3 border-b border-gray-100 bg-white">
                  <p className="text-xs text-gray-500 mb-2">Select files to restrict the AI search scope.</p>
                  {selectedFileIds.size > 0 && (
                    <button onClick={() => setSelectedFileIds(new Set())} className="text-xs text-brand-blue hover:underline font-medium">
                      Clear selection ({selectedFileIds.size})
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto p-2 bg-white">
                  {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                      <FileText className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">No files uploaded</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {files.map(file => (
                        <div 
                          key={file.id} 
                          onClick={() => toggleFileSelection(file.id)}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer border transition-colors ${
                            selectedFileIds.has(file.id) ? 'border-brand-blue bg-blue-50/50' : 'border-transparent hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center ${selectedFileIds.has(file.id) ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate" title={file.file_name}>{file.file_name}</p>
                            </div>
                          </div>
                          <button onClick={(e) => handleDeleteFile(file.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Chat History Section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden min-h-[300px]">
            <div 
              className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between cursor-pointer select-none shrink-0"
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
            >
              <div className="flex items-center gap-2">
                {isHistoryExpanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <h2 className="font-semibold text-gray-800">Chat History</h2>
              </div>
            </div>

            {isHistoryExpanded && (
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-gray-100 shrink-0">
                  <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-brand-blue bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100">
                    <Plus className="w-4 h-4" />
                    New Chat
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2" onClick={() => setActiveMenuId(null)}>
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-6">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-sm">No past conversations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(groupedConvos).map(([groupName, convos]) => (
                        convos.length > 0 && (
                          <div key={groupName}>
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">{groupName}</h3>
                            <div className="space-y-1">
                              {convos.map((c: any) => (
                                <div 
                                  key={c.id}
                                  onClick={() => loadConversation(c.id)}
                                  className={`relative group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                                    activeConversationId === c.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 pr-6">
                                    <p className="text-sm font-medium text-gray-800 truncate" title={c.title}>
                                      {c.title || 'New Conversation'}
                                    </p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                      {new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                  </div>

                                  {/* Menu Button */}
                                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === c.id ? null : c.id) }}
                                      className="p-1 rounded-md hover:bg-gray-200 text-gray-500"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Dropdown Menu */}
                                  {activeMenuId === c.id && (
                                    <div className="absolute right-6 top-8 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                                      <button 
                                        className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                                        onClick={(e) => { e.stopPropagation(); alert('Rename coming soon! Need conversation storage') }}
                                      >
                                        Rename
                                      </button>
                                      <button 
                                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center justify-between"
                                        onClick={(e) => deleteConversation(c.id, e)}
                                      >
                                        Delete <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Area */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-120px)]">
          
          {/* Overview Panel */}
          {files.length > 0 && hasInsights && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 max-h-[40%] overflow-y-auto shrink-0">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-brand-purple" />
                Workspace Overview
              </h2>
              
              {isFetchingOverview ? (
                <div className="animate-pulse flex space-x-4">
                  <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>
                </div>
              ) : hasInsights ? (
                <div className="space-y-4">
                  {overview.summary && (
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                      <h3 className="text-sm font-semibold text-purple-900 mb-2">Executive Summary</h3>
                      <p className="text-sm text-purple-800">{overview.summary}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {overview.decisions?.length > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                      <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Decisions
                      </h3>
                      <ul className="list-disc list-inside text-sm text-green-900 space-y-1">
                        {overview.decisions.slice(0,3).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {overview.pending_tasks?.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <h3 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1">
                        <FileQuestion className="w-4 h-4" /> Pending Tasks
                      </h3>
                      <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
                        {overview.pending_tasks.slice(0,3).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {overview.risks?.length > 0 && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                      <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Risks
                      </h3>
                      <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
                        {overview.risks.slice(0,3).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  {overview.missing_documentation?.length > 0 && (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                      <h3 className="text-sm font-semibold text-orange-800 mb-2 flex items-center gap-1">
                        <Copy className="w-4 h-4" /> Missing Docs
                      </h3>
                      <ul className="list-disc list-inside text-sm text-orange-900 space-y-1">
                        {overview.missing_documentation.slice(0,3).map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Ask AI Panel */}
          <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden flex-1`}>
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-brand-orange" />
                {activeConversationId ? 'Active Chat' : 'New Chat'}
              </h2>
              {selectedFileIds.size > 0 && (
                <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full font-medium">
                  Searching {selectedFileIds.size} selected file{selectedFileIds.size > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 max-w-md mx-auto text-center">
                  <FileQuestion className="w-12 h-12 mb-4 opacity-30" />
                  <h3 className="font-semibold mb-2 text-gray-700">Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple">Alpha Assistant</span></h3>
                  <p className="text-sm">Upload one or more documents.</p>
                  <p className="text-sm">Select the files you want.</p>
                  <p className="text-sm">Start asking questions.</p>
                  <p className="text-sm mt-4 text-brand-blue font-medium">Your conversations will appear in the sidebar.</p>
                  {files.length === 0 && (
                    <p className="text-center text-sm mt-4 text-red-500 bg-red-50 px-3 py-1 rounded-full inline-block">Upload at least one file to start.</p>
                  )}
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-brand-blue text-white rounded-br-none' 
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="prose prose-sm max-w-none break-words" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-2 ml-2 flex flex-wrap gap-2">
                        {msg.sources.map((s: any, sIdx: number) => (
                          <span key={sIdx} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 border border-gray-200 text-gray-500 px-2 py-1 rounded-full" title={s.snippet}>
                            <FileText className="w-3 h-3" />
                            {s.fileName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              {isAsking && (
                <div className="flex items-start">
                  <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none px-5 py-3 animate-pulse">
                    AlphaAssistant is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-gray-200 bg-white shrink-0">
              <form onSubmit={handleAsk} className="relative flex items-center">
                <input
                  type="text"
                  placeholder={files.length === 0 ? "Upload a file to start asking..." : "Ask about your projects, decisions, or tasks..."}
                  className="w-full bg-gray-50 border border-gray-200 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue disabled:opacity-50 disabled:bg-gray-100"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={files.length === 0 || isAsking}
                />
                <button
                  type="submit"
                  disabled={!question.trim() || files.length === 0 || isAsking}
                  className="absolute right-2 p-2 rounded-full bg-brand-blue text-white hover:bg-brand-blue/90 disabled:opacity-50 disabled:hover:bg-brand-blue transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  )
}
