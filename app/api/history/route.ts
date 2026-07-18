import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category')

    if (category) {
      // Fetch category-scoped persistent query history
      const { data: queries, error } = await supabase
        .from('queries')
        .select('id, question, answer, sources, insights')
        .eq('user_id', user.id)
        .eq('category', category)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching category history:', error)
        return NextResponse.json({ error: 'Failed to fetch category history' }, { status: 500 })
      }

      const messages: any[] = []
      queries?.forEach((q) => {
        messages.push({ id: q.id, role: 'user', content: q.question })
        messages.push({ id: q.id, role: 'ai', content: q.answer, sources: q.sources || [], visualization: q.insights?.visualization })
      })

      return NextResponse.json({ messages })
    }

    // Group queries by conversation_id to get unique conversations (fallback/legacy)
    const { data: queries, error } = await supabase
      .from('queries')
      .select('conversation_id, question, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    const conversationMap = new Map<string, any>()
    
    queries?.forEach((q) => {
      if (!conversationMap.has(q.conversation_id)) {
        conversationMap.set(q.conversation_id, {
          id: q.conversation_id,
          title: q.question,
          updatedAt: q.created_at,
          createdAt: q.created_at
        })
      } else {
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

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Query ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('queries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting chat message:', error)
      return NextResponse.json({ error: 'Failed to delete chat message' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

