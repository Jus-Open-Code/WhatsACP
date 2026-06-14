import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Activity, Users, MessageCircle, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url.includes('placeholder') || key.includes('placeholder')) return false;
  return true;
};

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  let count = 4; // Default to 4 mock projects if offline
  if (isSupabaseConfigured()) {
    try {
      const { count: fetchedCount, error } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      if (!error && fetchedCount !== null) {
        count = fetchedCount;
      }
    } catch (err) {
      console.warn("Failed to fetch projects count from Supabase:", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">Welcome back, Akash 👋</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Here is what's happening with your WhatsApp CRM today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* Stats Cards */}
         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Groups</p>
               <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg"><Users className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 dark:text-slate-100 mt-4">{count || 0}</p>
         </div>

         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Active Devices</p>
               <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg"><Activity className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
            </div>
            <div className="flex items-end gap-2 mt-4">
               <p className="text-4xl font-black text-gray-800 dark:text-slate-100">1</p>
               <span className="text-sm text-green-500 dark:text-green-400 font-medium mb-1">Online</span>
            </div>
         </div>

         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all duration-200 opacity-60">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Auto-Replies</p>
               <div className="p-2 bg-purple-50 dark:bg-purple-950/30 rounded-lg"><MessageCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 dark:text-slate-100 mt-4">N/A</p>
         </div>

         <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800/80 flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Efficiency</p>
               <div className="p-2 bg-orange-50 dark:bg-orange-950/30 rounded-lg"><BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 dark:text-slate-100 mt-4">98%</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* WhatsApp CRM Connect Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-indigo-500/5 dark:from-slate-900 dark:to-indigo-950/10 relative overflow-hidden min-h-[260px] hover:shadow-md transition-all duration-200">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-600"></div>
           <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-550/5 rounded-full blur-3xl pointer-events-none" />
           
           <div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-3 tracking-tight">Ready to automate your workflow?</h2>
             <p className="text-gray-500 dark:text-slate-400 text-xs leading-relaxed mb-6 font-medium">Link your WhatsApp device to fetch camera production groups in real-time securely from your browser and start collaborating.</p>
           </div>
           <div>
             <Link href="/whatsapp" className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/10 transition hover:-translate-y-0.5 active:translate-y-0">
                Go to WhatsApp Connect <ArrowRight className="w-4 h-4" />
             </Link>
           </div>
        </div>

        {/* Google Drive Integration Banner Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-gray-100 dark:border-slate-800/80 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-emerald-500/5 dark:from-slate-900 dark:to-emerald-950/10 relative overflow-hidden min-h-[260px] hover:shadow-md transition-all duration-200">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
           <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-550/5 rounded-full blur-3xl pointer-events-none" />
           
           <div>
             <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-3 tracking-tight">Sync Google Drive</h2>
             <p className="text-gray-500 dark:text-slate-400 text-xs leading-relaxed mb-6 font-medium">Link your studio's Google Drive storage for instant production delivery sheet sharing, raw file tracking, and automated client folders creation.</p>
           </div>
           <div>
             <a 
               href="https://drive.google.com" 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-md shadow-emerald-500/10 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
             >
                Connect Google Drive <ArrowRight className="w-4 h-4" />
             </a>
           </div>
        </div>
      </div>
    </div>
  )
}
