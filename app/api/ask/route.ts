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
    const category = body.category || 'All Documents'

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
    let allCookies: any[] = []
    if (process.env.TEST_ENV !== 'true') {
      const cookieStore = await cookies()
      allCookies = cookieStore.getAll()
    }
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
          // Resolve category-scoped conversation_id if conversationId is not provided
          let activeConvId = conversationId
          if (user && category && !activeConvId && body.mode !== 'demo') {
            const { data: existingQuery } = await staticSupabase
              .from('queries')
              .select('conversation_id')
              .eq('user_id', user.id)
              .eq('category', category)
              .limit(1)
            
            if (existingQuery && existingQuery.length > 0) {
              activeConvId = existingQuery[0].conversation_id
            }
          }

          // 1. Fetch previous messages if activeConvId is resolved
          let previousMessages: any[] = []
          if (user && activeConvId && body.mode !== 'demo') {
            const { data: pastQueries } = await staticSupabase
              .from('queries')
              .select('question, answer')
              .eq('conversation_id', activeConvId)
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
          
          // Generate visualization object if the answer contains quantitative data
          const insights: any = {}
          try {
            const hasQuantitativeIndicator = /[0-9]|percent|ratio|total|revenue|expense|cost|salary|average|chart|graph|plot|compare|invoice|department|distribution|share|trend|monthly|weekly|daily/i.test(question + ' ' + answer);
            
            if (hasQuantitativeIndicator) {
              const visPrompt = `You are a data visualization assistant. Analyze the user question and the retrieved text context to determine if a chart would improve the response.
User Question: "${question}"
Answer: "${answer}"
Context:
${context}

If the question is qualitative or lists non-numerical decisions, or there is no structured numerical data, respond with exactly: None.

If a chart (line, bar, pie, kpi, table) is appropriate, select one based on these rules:
- Trend over time (monthly, weekly, daily, etc.): line
- Compare categories: bar
- Percentage breakdown/shares: pie
- Single metric: kpi
- Structured list/multiple rows: table

Output a JSON object ONLY, matching this schema:
{
  "type": "line" | "bar" | "pie" | "kpi" | "table",
  "title": "Descriptive chart title",
  "xKey": "the exact key name representing the label in the data objects (e.g. \"invoice\")",
  "yKey": "the exact key name representing the numerical value in the data objects (e.g. \"amount\")",
  "data": [
    // Array of objects. The keys in these objects MUST match the values of xKey and yKey exactly.
    // E.g. if xKey is "invoice" and yKey is "amount", then data should be [{"invoice": "INV-501", "amount": 15000}]
  ]
}
Ensure the data contains actual numbers extracted from the context. Do not wrap the JSON in markdown formatting.`;

              const visCompletion = await llm.chat.completions.create({
                model: getModelName(),
                messages: [{ role: 'user', content: visPrompt }],
                temperature: 0,
              });
              
              const visText = visCompletion.choices[0].message.content?.trim() || 'None';
              if (visText && visText !== 'None' && !visText.startsWith('None')) {
                const cleanJson = visText.replace(/```json/i, '').replace(/```/, '').trim();
                const parsedVis = JSON.parse(cleanJson);
                if (parsedVis && parsedVis.type && parsedVis.data) {
                  insights.visualization = parsedVis;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'visualization', data: parsedVis })}\n\n`))
                }
              }
            }
          } catch (visErr) {
            console.error('Failed to generate visualization:', visErr);
          }

          // Send sources after the answer completes streaming
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'sources', data: formattedSources })}\n\n`))

          // Save to database if authenticated
          if (user && body.mode !== 'demo') {
            try {
              console.log('Attempting to save query to Supabase for user:', user.id)
              const insertPayload: any = {
                user_id: user.id,
                question: question,
                answer: answer,
                sources: formattedSources,
                insights: insights,
                category: category
              }
              if (activeConvId) {
                insertPayload.conversation_id = activeConvId
              }

              const { data: insertData, error: insertError } = await staticSupabase.from('queries').insert(insertPayload).select()
              
              if (insertError) {
                console.error('Supabase Error saving query:', insertError)
              } else if (insertData && insertData.length > 0) {
                console.log('Successfully saved query to Supabase:', insertData[0].id)
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'query_id', data: insertData[0].id })}\n\n`))
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
