import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WorkspaceClient } from '@/components/workspace-client'

export default async function WorkspacePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's initial files
  const { data: initialFiles, error } = await supabase
    .from('files')
    .select('id, file_name, source_type, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching initial files:', error)
  }

  return <WorkspaceClient user={user} initialFiles={initialFiles || []} />
}
