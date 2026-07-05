'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Trash2, Upload, RefreshCw, Send, CheckCircle2, AlertTriangle, FileQuestion, Copy, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

type FileItem = {
  id: string
  file_name: string
  source_type: string
  created_at: string
}

type InsightData = {
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

  // Fetch overview on mount if there are files
  useEffect(() => {
    if (files.length > 0 && !overview) {
      fetchOverview()
    }
  }, [files])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    setMessages(prev => [...prev, { role: 'user', content: currentQuestion }])
    setIsAsking(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: currentQuestion,
          fileIds: Array.from(selectedFileIds)
        })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'ai', content: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: data.answer,
          sources: data.sources 
        }])
      }
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, something went wrong.' }])
    } finally {
      setIsAsking(false)
    }
  }

  const hasInsights = overview && (
    (overview.decisions && overview.decisions.length > 0) ||
    (overview.pending_tasks && overview.pending_tasks.length > 0) ||
    (overview.risks && overview.risks.length > 0) ||
    (overview.missing_documentation && overview.missing_documentation.length > 0)
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
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
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sidebar: Files */}
        <div className="lg:col-span-4 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-120px)] sticky top-[90px]">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">File Repository</h2>
            <span className="text-xs font-medium bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
              {files.length} files
            </span>
          </div>
          
          <div className="p-4 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-2">
              Select files to restrict the AI search scope. If none are selected, AI searches all files.
            </p>
            {selectedFileIds.size > 0 && (
              <button 
                onClick={() => setSelectedFileIds(new Set())}
                className="text-xs text-brand-blue hover:underline font-medium"
              >
                Clear selection ({selectedFileIds.size})
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <FileText className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No files uploaded yet</p>
                <p className="text-xs mt-1">Upload files to start generating insights and asking questions.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {files.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => toggleFileSelection(file.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${
                      selectedFileIds.has(file.id) 
                        ? 'border-brand-blue bg-blue-50/50' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                        selectedFileIds.has(file.id) ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.file_name}>
                          {file.file_name}
                        </p>
                        <p className="text-xs text-gray-500" suppressHydrationWarning>
                          {new Date(file.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Area */}
        <div className="lg:col-span-8 flex flex-col gap-6 h-[calc(100vh-120px)]">
          
          {/* Overview Panel */}
          {files.length > 0 && (
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
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-center">
                  No structural insights found in the current documents. Try uploading more detailed files.
                </div>
              )}
            </div>
          )}

          {/* Ask AI Panel */}
          <div className={`bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden ${files.length > 0 ? 'flex-1' : 'h-full'}`}>
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-brand-orange" />
                Ask Company Brain
              </h2>
              {selectedFileIds.size > 0 && (
                <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-1 rounded-full font-medium">
                  Searching {selectedFileIds.size} selected file{selectedFileIds.size > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <FileQuestion className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-center">Ask a question about your uploaded documents.</p>
                  {files.length === 0 && (
                    <p className="text-center text-sm mt-2 text-red-500">Upload at least one file to start.</p>
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
                    Company Brain is thinking...
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
