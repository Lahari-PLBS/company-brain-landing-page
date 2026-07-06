import { NextRequest, NextResponse } from 'next/server'
import { loadDemoFiles } from '@/lib/sample-data'
import { chunkFiles } from '@/lib/chunk'
import { retrieveTopChunks } from '@/lib/retrieve'
import { buildSystemPrompt, buildInsightsPrompt } from '@/lib/prompts'
import { llm, getModelName } from '@/lib/llm'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question = body.question
    const fileIds = body.fileIds // Array of string UUIDs
    const conversationId = body.conversationId // Optional: existing conversation

    if (!question) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 })
    }

    let filesToSearch = []
    
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user && body.mode !== 'demo') {
      let query = supabase.from('files').select('*').eq('user_id', user.id)
      
      if (fileIds && Array.isArray(fileIds) && fileIds.length > 0) {
        query = query.in('id', fileIds)
      }
      
      const { data: dbFiles, error } = await query
      
      if (error) {
        console.error('Error fetching files:', error)
        return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
      }
      
      filesToSearch = (dbFiles || []).map(f => ({
        fileName: f.file_name,
        sourceType: f.source_type || 'document',
        content: f.content,
        project: 'Workspace'
      }))
    } else {
      // Fallback to demo files or provided files array (for legacy compat)
      filesToSearch = body.files && body.files.length > 0 ? body.files : await loadDemoFiles()
    }
    
    if (filesToSearch.length === 0) {
      return NextResponse.json({ error: 'No files available to search.' }, { status: 400 })
    }

    const chunks = chunkFiles(filesToSearch)
    const topChunks = retrieveTopChunks(question, chunks, 3)
    const context = topChunks.map((c) => `[${c.fileName}] ${c.text}`).join('\n\n')
    
    const formattedSources = topChunks.map((chunk) => ({
      fileName: chunk.fileName,
      project: chunk.project,
      snippet: chunk.text,
    }))

    // Capture cookies statically before stream starts to prevent dynamic server usage errors
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const staticSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return allCookies },
          setAll() {}
        }
      }
    )

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 1. Fetch previous messages if conversationId is provided
          let previousMessages: any[] = []
          if (user && conversationId && body.mode !== 'demo') {
            const { data: pastQueries } = await staticSupabase
              .from('queries')
              .select('question, answer')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })

            if (pastQueries) {
              pastQueries.forEach(pq => {
                previousMessages.push({ role: 'user', content: pq.question })
                previousMessages.push({ role: 'assistant', content: pq.answer })
              })
            }
          }

          // 2. Stream the answer
          const chatStream = await llm.chat.completions.create({
            model: getModelName(),
            messages: [
              { role: 'system', content: buildSystemPrompt(context) },
              ...previousMessages,
              { role: 'user', content: question }
            ],
            temperature: 0.2,
            stream: true,
          })

          let answer = ''
          for await (const chunk of chatStream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              answer += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', data: text })}\n\n`))
            }
          }
          
          // Send sources after the answer completes streaming
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', data: formattedSources })}\n\n`))

          // 3. Remove inline insights generation for faster response times.
          // Insights will only be fetched via the dedicated /api/overview endpoint.
          const insights = {}

          // 4. Save to database if authenticated
          if (user && body.mode !== 'demo') {
            try {
              console.log('Attempting to save query to Supabase for user:', user.id)
              const insertPayload: any = {
                user_id: user.id,
                question: question,
                answer: answer,
                sources: formattedSources,
                insights: insights
              }
              if (conversationId) {
                insertPayload.conversation_id = conversationId
              }

              const { data: insertData, error: insertError } = await staticSupabase.from('queries').insert(insertPayload).select()
              
              if (insertError) {
                console.error('Supabase Error saving query:', insertError)
              } else if (insertData && insertData.length > 0) {
                console.log('Successfully saved query to Supabase:', insertData[0].id)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', data: insertData[0].conversation_id })}\n\n`))
              }
            } catch (err: any) {
              console.error('Exception during Supabase insert:', err)
            }
          }

          // Finish stream
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`))
        } catch (err: any) {
          console.error('Streaming error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: err.message || 'Stream failed' })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'none',
      },
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
