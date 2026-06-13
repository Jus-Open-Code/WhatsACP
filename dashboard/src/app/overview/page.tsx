import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Activity, Users, MessageCircle, BarChart3, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true })

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back, Akash 👋</h1>
        <p className="text-gray-500 mt-2 font-medium">Here is what's happening with your WhatsApp CRM today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* Stats Cards */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Total Groups</p>
               <div className="p-2 bg-blue-50 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 mt-4">{count || 0}</p>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Active Devices</p>
               <div className="p-2 bg-green-50 rounded-lg"><Activity className="w-5 h-5 text-green-600" /></div>
            </div>
            <div className="flex items-end gap-2 mt-4">
              <p className="text-4xl font-black text-gray-800">1</p>
              <span className="text-sm text-green-500 font-medium mb-1">Online</span>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow opacity-60">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Auto-Replies</p>
               <div className="p-2 bg-purple-50 rounded-lg"><MessageCircle className="w-5 h-5 text-purple-600" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 mt-4">N/A</p>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
               <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">Efficiency</p>
               <div className="p-2 bg-orange-50 rounded-lg"><BarChart3 className="w-5 h-5 text-orange-600" /></div>
            </div>
            <p className="text-4xl font-black text-gray-800 mt-4">98%</p>
         </div>
      </div>

      <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center py-20 mt-8 bg-gradient-to-br from-white to-blue-50/50 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
         <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to automate your workflow?</h2>
         <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">Head over to the WhatsApp Connect page to link your device and start fetching groups in real-time securely from your browser.</p>
         <Link href="/whatsapp" className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold shadow-md hover:bg-blue-700 transition hover:-translate-y-0.5 active:translate-y-0">
            Go to WhatsApp Connect <ArrowRight className="w-4 h-4" />
         </Link>
      </div>
    </div>
  )
}
