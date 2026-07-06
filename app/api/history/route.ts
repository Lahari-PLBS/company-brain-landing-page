import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Group queries by conversation_id to get unique conversations.
    // We select the first question (by created_at) as the title,
    // and the latest created_at as the updated time.
    // In PostgreSQL (Supabase), we can use a window function or distinct on.
    // But for simplicity with the Supabase client, we'll fetch all queries for the user,
    // sorted by created_at, and process them in memory.
    const { data: queries, error } = await supabase
      .from('queries')
      .select('conversation_id, question, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Grouping by conversation_id
    const conversationMap = new Map<string, any>()
    
    queries.forEach((q) => {
      if (!conversationMap.has(q.conversation_id)) {
        conversationMap.set(q.conversation_id, {
          id: q.conversation_id,
          title: q.question, // The first one we see is the newest, but we'll use it as title for now. Actually, oldest is better for title.
          updatedAt: q.created_at,
          createdAt: q.created_at // Will update this
        })
      } else {
        // Since we iterate from newest to oldest, the later ones we see are older.
        // Update the title to the oldest question, and createdAt to the oldest.
        const conv = conversationMap.get(q.conversation_id)
        conv.title = q.question
        conv.createdAt = q.created_at
      }
    })

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
