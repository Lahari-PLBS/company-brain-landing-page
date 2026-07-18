import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkFiles } from '@/lib/chunk'
import { llm, getModelName } from '@/lib/llm'
import { loadDemoFiles } from '@/lib/sample-data'

const categoriesConfig = [
  { name: 'Staff', keywords: ['employee', 'attendance', 'payroll', 'staff'] },
  { name: 'Customers / Clients', keywords: ['customer', 'client', 'feedback'] },
  { name: 'Inventory', keywords: ['inventory', 'equipment', 'stock'] },
  { name: 'Finance', keywords: ['financial', 'ledger', 'billing', 'revenue', 'expense'] },
  { name: 'Meetings', keywords: ['meeting', 'minutes', 'board'] },
  { name: 'Daily Reports', keywords: ['daily', 'shift', 'report'] },
  { name: 'Communications', keywords: ['email', 'chat', 'communication', 'support'] },
  { name: 'Policies', keywords: ['policy', 'conduct', 'rule', 'guideline'] }
]

function getCategoryForFile(fileName: string): string {
  const name = fileName.toLowerCase();
  for (const cat of categoriesConfig) {
    if (cat.keywords.some(keyword => name.includes(keyword))) {
      return cat.name;
    }
  }
  return 'Policies';
}

const categoryExpectationsMap: Record<string, string> = {
  'All Documents': 'Focus on general status, cross-functional activities, administrative updates, and high-level milestones across the entire organization.',
  'Staff': 'Focus on employee headcount, roles, shifts, scheduling, salaries, onboarding, performance review findings, and general human resource updates.',
  'Customers / Clients': 'Focus on customer or client feedback, satisfaction reviews, service interactions, customer demographics, and support tickets.',
  'Inventory': 'Focus on stock levels, catalogs, equipment operations, supplies, reorder thresholds, and maintenance logs.',
  'Finance': 'Focus on revenue trends, ledger entries, operating expenses, billing, invoicing, and budget updates.',
  'Meetings': 'Focus on meeting agendas, action items, attendee lists, board decisions, and task updates.',
  'Daily Reports': 'Focus on operation logs, checklist completions, daily shift handovers, daily checklists, and general daily status reports.',
  'Communications': 'Focus on email logs, text conversations, message boards, notification dispatches, and support tickets.',
  'Policies': 'Focus on safety compliance procedures, employee codes of conduct, operational rules, workflows, and standard protocols.'
}

export async function GET() {
  try {
    return await processOverview('workspace', 'All Documents', undefined)
  } catch (error: any) {
    console.error('Overview generation failed:', error)
    return NextResponse.json({ error: `Overview generation failed: ${error.message || error}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const mode = body.mode || 'workspace'
    const category = body.category || 'All Documents'
    return await processOverview(mode, category, body.files)
  } catch (error: any) {
    console.error('Overview generation failed:', error)
    return NextResponse.json({ error: `Overview generation failed: ${error.message || error}` }, { status: 500 })
  }
}

async function processOverview(mode: string, category: string, bodyFiles?: any[]) {
  let rawFiles: any[] = []

  // 1. Resolve files based on mode
  if (bodyFiles && Array.isArray(bodyFiles) && bodyFiles.length > 0) {
    rawFiles = bodyFiles
  } else if (mode === 'demo') {
    rawFiles = await loadDemoFiles()
  } else {
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
    rawFiles = files || []
  }

  // 2. Filter files by category
  const filteredFiles = category && category !== 'All Documents'
    ? rawFiles.filter(f => {
        const fileCategory = f.category || getCategoryForFile(f.file_name || f.fileName)
        return fileCategory === category
      })
    : rawFiles

  // 3. Short-circuit if no files are in this category
  if (filteredFiles.length === 0) {
    return NextResponse.json({
      insights: {
        summary: `No documents available in the "${category}" category.`,
        decisions: [],
        pending_tasks: [],
        risks: [],
        missing_documentation: [],
        important_highlights: []
      }
    })
  }

  // 4. Map and chunk files
  const formattedFiles = filteredFiles.map(f => ({
    fileName: f.file_name || f.fileName,
    content: f.content || '',
    sourceType: f.source_type || f.sourceType || 'document',
    project: f.project || 'Workspace'
  })) as any

  const chunks = chunkFiles(formattedFiles)
  // Limit to 10 chunks to stay under token limit
  const contextChunks = chunks.slice(0, 10)
  const context = contextChunks.map((c) => `[${c.fileName}] ${c.text}`).join('\n\n')

  // 5. Build prompt
  const categoryExpectations = categoryExpectationsMap[category] || categoryExpectationsMap['All Documents']
  const prompt = `You are an expert business analyst compiling a structured JSON overview for the category: "${category}".
Analyze the provided document context below:
${context}

Your output must focus specifically on this area:
${categoryExpectations}

CRITICAL INSTRUCTIONS:
1. Strict Factuality: Generate the overview using ONLY information explicitly stated in the provided document context. 
2. No Extrapolations: Do NOT hallucinate, assume, extrapolate, or introduce external facts. Everything in your response must be directly traceable to the context.
3. Empty States: If the context does not contain information for a specific key (e.g. no risks are mentioned, or no decisions were made), return an empty array \`[]\` or null. Do NOT manufacture data.
4. Suggestions Clause: Do NOT suggest future implementations, resolutions, or suggestions unless explicitly requested in subsequent prompts. Be strictly descriptive of the existing facts in the files.

Provide a structured JSON output with precisely the following keys:
- summary: (A high-level executive summary of this category context, strictly factual)
- decisions: (A list of decisions made related to this category, explicitly found in files)
- pending_tasks: (A list of pending actions or tasks related to this category, explicitly found in files)
- risks: (A list of risks, warnings, or complications related to this category, explicitly found in files)
- missing_documentation: (A list of specific documents or figures that are explicitly mentioned in the text of the files as missing, incomplete, or unavailable. Do NOT list the active files themselves, do NOT list general context/purpose/scope gaps, and do NOT list absent categories. If no specific files are explicitly referenced as missing in the texts, return an empty array \`[]\`.)
- important_highlights: (A list of notable metrics, figures, or highlights in this category, explicitly found in files)
- kpi_cards: (An array of objects representing high-level key performance metrics or counts, e.g., [{"title": "Total Revenue", "value": "₹2.4 Cr"}]. Only include this if meaningful numerical metrics exist in the context, otherwise return an empty array \`[]\`.)`

  const generateWithRetry = async (params: any, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await llm.chat.completions.create(params);
      } catch (error: any) {
        console.warn(`LLM attempt ${i + 1} failed:`, error.message || error);
        if (i === retries - 1) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    throw new Error('Failed to generate content after retries');
  };

  let messages = [{ role: 'user', content: prompt }];
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
    messages.push({ role: 'user', content: 'Your previous response was too long and got cut off. Please re-generate the JSON but make it much more concise to ensure it fits within the limit.' });
    
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
}
