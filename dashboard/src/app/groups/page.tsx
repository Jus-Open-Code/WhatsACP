import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import KanbanBoard from '@/components/KanbanBoard'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  return true;
};

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let projects = []
  let error = null
  let isOffline = false

  if (isSupabaseConfigured()) {
    try {
      // Fetch all projects from Supabase
      const { data, error: fetchError } = await supabase.from('projects').select('*').order('created_at', { ascending: false })
      if (fetchError) {
        error = fetchError
      } else {
        projects = data || []
      }
    } catch (err: any) {
      error = err
    }
  } else {
    // Skip network request and trigger mock fallback immediately
    error = new Error("Supabase is in placeholder/mock mode");
  }

  if (error) {
    console.warn("Supabase fetch error, switching to mock database fallback:", error)
    isOffline = true
    
    // Premium mock camera production groups for local sandbox demo
    projects = [
      {
        id: 1,
        group_name: "Akash & Riya Pre-Wedding Shoot",
        whatsapp_group_id: "1203632948293029@g.us",
        event_month: "15 Oct 2026",
        status: "Pre-Prod"
      },
      {
        id: 2,
        group_name: "Sharma Wedding Highlight",
        whatsapp_group_id: "1203632948293030@g.us",
        event_month: "28 Nov 2026",
        status: "Editing"
      },
      {
        id: 3,
        group_name: "Verma Sangeet Production",
        whatsapp_group_id: "1203632948293031@g.us",
        event_month: "12 Dec 2026",
        status: "Completed"
      },
      {
        id: 4,
        group_name: "Kapoor Reception Teaser",
        whatsapp_group_id: "1203632948293032@g.us",
        event_month: "05 Jan 2027",
        status: "Revisions"
      }
    ]
  }

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {isOffline && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-3 text-amber-800 dark:text-amber-350 font-sans shadow-sm text-xs md:text-sm transition-colors duration-200">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <p className="font-semibold">
            Local Fallback Mode: Running with local sandbox camera production groups. Check your <code className="bg-amber-150 dark:bg-amber-900/40 px-1.5 py-0.5 rounded font-mono text-xs border border-amber-250/30 dark:border-amber-900/30">.env.local</code> credentials to sync with your live Supabase database.
          </p>
        </div>
      )}
      <KanbanBoard initialProjects={projects} />
    </div>
  )
}
