import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import KanbanBoard from '@/components/KanbanBoard'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Fetch all projects from Supabase
  const { data: projects, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false })

  if (error) {
    console.error("Supabase fetch error:", error)
    return (
      <div className="p-10 text-red-500 bg-red-50 rounded-lg m-10 border border-red-200 font-sans shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Database Connection Error</h1>
        <p>Could not load projects from Supabase. Make sure your SUPABASE_URL and KEY are correct and the 'projects' table exists.</p>
        <pre className="mt-4 bg-white p-4 rounded text-sm overflow-auto text-gray-800 border border-red-100">{JSON.stringify(error, null, 2)}</pre>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-500">
      <KanbanBoard initialProjects={projects || []} />
    </div>
  )
}
