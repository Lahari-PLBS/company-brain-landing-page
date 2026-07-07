import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkFiles } from '@/lib/chunk'
import { buildInsightsPrompt } from '@/lib/prompts'
import { llm, getModelName } from '@/lib/llm'
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: files, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching files:', error)
      return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
    }

    if (!files || files.length === 0) {
      return NextResponse.json({
        insights: {
          decisions: [],
          pending_tasks: [],
          risks: [],
          missing_documentation: [],
          duplicate_work: []
        }
      })
    }

    // Map DB files to the format expected by chunkFiles
    const formattedFiles = files.map(f => ({
      name: f.file_name,
      content: f.content,
      project: 'Workspace'
    })) as any

    const chunks = chunkFiles(formattedFiles)
    // For overview, we take a representative sample of chunks to avoid token limits.
    // Limiting to 10 chunks to stay safely under the 8192 token limit for LLaMA 3.
    const contextChunks = chunks.slice(0, 10)
    const context = contextChunks.map((c) => `[${c.fileName}] ${c.text}`).join('\n\n')

    const generateWithRetry = async (params: any, retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          return await llm.chat.completions.create(params);
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

    let messages = [{ role: 'user', content: buildInsightsPrompt(context) }];
    let insightsCompletion = await generateWithRetry({
      model: getModelName(),
      messages: messages,
      temperature: 0,
      max_tokens: 2500,
      response_format: { type: 'json_object' }
    });

    if (insightsCompletion.choices[0].finish_reason === 'length') {
      console.warn("Response exceeded max_tokens, retrying for a more concise version...");
      messages.push({ role: 'assistant', content: insightsCompletion.choices[0].message.content || '' });
      messages.push({ role: 'user', content: 'Your previous response was too long and got cut off due to token limits. Please re-generate the JSON but make it much more concise to ensure it fits within the limit while answering the question.' });
      
      insightsCompletion = await generateWithRetry({
        model: getModelName(),
        messages: messages,
        temperature: 0,
        max_tokens: 2500,
        response_format: { type: 'json_object' }
      });
    }

    const insightsText = insightsCompletion.choices[0].message.content || '{}'
    let insights = {}
    try {
      insights = JSON.parse(insightsText)
    } catch (e) {
      console.error('Failed to parse insights JSON', e)
    }

    return NextResponse.json({ insights })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
