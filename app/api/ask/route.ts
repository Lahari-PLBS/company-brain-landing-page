import { NextRequest, NextResponse } from 'next/server'
import { loadDemoFiles } from '@/lib/sample-data'
import { chunkFiles } from '@/lib/chunk'
import { retrieveTopChunks } from '@/lib/retrieve'
import { buildAnswerPrompt, buildInsightsPrompt } from '@/lib/prompts'
import { ai } from '@/lib/gemini'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question = body.question
    const fileIds = body.fileIds // Array of string UUIDs

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
        name: f.file_name,
        content: f.content,
        project: 'Workspace'
      }))
    } else {
      // Fallback to demo files or provided files array (for legacy compat)
      filesToSearch = body.files && body.files.length > 0 ? body.files : loadDemoFiles()
    }
    
    if (filesToSearch.length === 0) {
      return NextResponse.json({ error: 'No files available to search.' }, { status: 400 })
    }

    const chunks = chunkFiles(filesToSearch)
    const topChunks = retrieveTopChunks(question, chunks, 5)
    const context = topChunks.map((c) => `[${c.fileName}] ${c.text}`).join('\n\n')

    const generateWithRetry = async (params: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await ai.models.generateContent(params);
        } catch (error: any) {
          if (i === retries - 1) throw error;
          if (error?.status === 503 || error?.status === 429) {
            await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
            continue;
          }
          throw error;
        }
      }
      throw new Error('Failed to generate content after retries');
    };

    const answerCompletion = await generateWithRetry({
      model: 'gemini-2.0-flash-lite',
      contents: buildAnswerPrompt(question, context),
      config: {
        temperature: 0.2,
      }
    });

    // We only generate insights if we're not in the workspace, or if we want to update insights with each query.
    // Wait, the workspace overview should handle insights, but we can keep it here for demo dashboard compatibility.
    const insightsCompletion = await generateWithRetry({
      model: 'gemini-2.0-flash-lite',
      contents: buildInsightsPrompt(context),
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
      }
    });

    const answer = answerCompletion.text || 'No answer generated.'
    const insightsText = insightsCompletion.text || '{}'
    let insights = {}
    try {
      insights = JSON.parse(insightsText)
    } catch (e) {
      console.error('Failed to parse insights JSON', e)
    }

    // If authenticated, we should probably save the query to the DB
    if (user && body.mode !== 'demo') {
      const sources = topChunks.map((chunk) => ({
        fileName: chunk.fileName,
        project: chunk.project,
        snippet: chunk.text,
      }))
      
      const { error: insertError } = await supabase.from('queries').insert({
        user_id: user.id,
        question: question,
        answer: answer,
        sources: sources,
        insights: insights
      })
      
      if (insertError) {
        console.error('Error saving query:', insertError)
      }
    }

    return NextResponse.json({
      answer,
      sources: topChunks.map((chunk) => ({
        fileName: chunk.fileName,
        project: chunk.project,
        snippet: chunk.text,
      })),
      insights,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
