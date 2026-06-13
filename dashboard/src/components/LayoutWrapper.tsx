"use client";

import { usePathname } from 'next/navigation';
import { 
  Home, 
  MessageSquare, 
  LayoutDashboard, 
  Settings, 
  Smartphone, 
  Users, 
  LogOut, 
  ChevronRight,
  User
} from 'lucide-react';
import Link from 'next/link';
import AuthGuard from './AuthGuard';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Public paths that do not show sidebar or header
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {}

    localStorage.removeItem('whatsacp_session');
    toast.success("Logged out successfully");
    router.replace('/login');
  };

  if (isPublicPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  // Resolve active page name for breadcrumbs
  const getPageName = () => {
    switch (pathname) {
      case '/overview': return 'dashboard';
      case '/whatsapp': return 'whatsapp-connect';
      case '/groups': return 'group-manager';
      case '/chat': return 'inbox';
      default: return 'dashboard';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen flex w-full bg-[#f8fafc] text-gray-900 font-sans overflow-hidden">
        
        {/* NARROW ICON-ONLY SIDEBAR (Matches WhatsACP reference) */}
        <aside className="w-20 bg-[#0c101b] flex flex-col items-center fixed left-0 top-0 h-full z-20 shadow-xl py-6 shrink-0 border-r border-slate-900">
          
          {/* Logo: Round green circle with white W */}
          <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20 mb-8 cursor-pointer select-none">
            w
          </div>

          {/* Navigation stack */}
          <nav className="flex-1 flex flex-col items-center gap-5 w-full">
            
            {/* Overview / Dashboard */}
            <div className="relative group">
              <Link 
                href="/overview" 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  pathname === '/overview' 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
              <span className="absolute left-[70px] top-3 scale-0 group-hover:scale-100 transition-all rounded-md bg-slate-800 text-white text-xs font-bold px-2 py-1 z-30 shadow-md pointer-events-none select-none">
                Overview
              </span>
            </div>

            {/* Inbox / Live Chat */}
            <div className="relative group">
              <Link 
                href="/chat" 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  pathname === '/chat' 
                    ? 'bg-[#10b981]/15 text-[#10b981] border-l-4 border-[#10b981]' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
              </Link>
              <span className="absolute left-[70px] top-3 scale-0 group-hover:scale-100 transition-all rounded-md bg-slate-800 text-white text-xs font-bold px-2 py-1 z-30 shadow-md pointer-events-none select-none">
                Inbox
              </span>
            </div>

            {/* WhatsApp Setup */}
            <div className="relative group">
              <Link 
                href="/whatsapp" 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  pathname === '/whatsapp' 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Smartphone className="w-5 h-5" />
              </Link>
              <span className="absolute left-[70px] top-3 scale-0 group-hover:scale-100 transition-all rounded-md bg-slate-800 text-white text-xs font-bold px-2 py-1 z-30 shadow-md pointer-events-none select-none">
                WhatsApp Setup
              </span>
            </div>

            {/* Group Manager */}
            <div className="relative group">
              <Link 
                href="/groups" 
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                  pathname === '/groups' 
                    ? 'bg-white/10 text-white' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Users className="w-5 h-5" />
              </Link>
              <span className="absolute left-[70px] top-3 scale-0 group-hover:scale-100 transition-all rounded-md bg-slate-800 text-white text-xs font-bold px-2 py-1 z-30 shadow-md pointer-events-none select-none">
                Group Manager
              </span>
            </div>

            {/* Sign Out (at the bottom) */}
            <div className="relative group mt-auto">
              <button 
                onClick={handleLogout}
                className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <span className="absolute left-[70px] top-3 scale-0 group-hover:scale-100 transition-all rounded-md bg-slate-800 text-white text-xs font-bold px-2 py-1 z-30 shadow-md pointer-events-none select-none">
                Sign Out
              </span>
            </div>

          </nav>

        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-1 ml-20 flex flex-col h-screen overflow-hidden bg-slate-50">
          
          {/* TOP BREADCRUMB BAR (Matches inbox_light.png top layout) */}
          <header className="h-14 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-6 shadow-sm shrink-0">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-slate-400 font-semibold text-xs">
              <Home className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="hover:text-slate-600 cursor-pointer">{getPageName()}</span>
            </div>
            
            {/* Profile Initials & Settings */}
            <div className="flex items-center gap-4 text-slate-500">
              <button className="hover:text-slate-800"><Settings className="w-4.5 h-4.5" /></button>
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm select-none">
                Pro
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-inner select-none cursor-pointer">
                AC
              </div>
            </div>
          </header>
          
          {/* Main child viewport */}
          <div className={`flex-1 flex flex-col overflow-hidden ${pathname === '/chat' ? 'p-0' : 'p-8 overflow-y-auto'}`}>
             {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
