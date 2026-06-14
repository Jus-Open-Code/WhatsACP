"use client";

import Link from 'next/link';
import { MessageSquare, ArrowRight, Smartphone, Kanban, Calendar, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Default to dark for landing

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative overflow-hidden transition-colors duration-300">
      
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-slate-200 dark:border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-slate-900 dark:text-white">WhatsACP</span>
        </div>
        <div className="flex items-center gap-4">
          
          {/* MuiIconButton-style Dark/Light Theme Button */}
          <button 
            onClick={toggleTheme}
            className="MuiButtonBase-root MuiIconButton-root MuiIconButton-sizeSmall css-1hbkoj9"
            tabIndex={0}
            type="button" 
            aria-label={theme === 'dark' ? "Switch to Light" : "Switch to Dark"}
          >
            <svg className="MuiSvgIcon-root MuiSvgIcon-fontSizeMedium css-vt8pii" focusable="false" aria-hidden="true" viewBox="0 0 24 24">
              {theme === 'dark' ? (
                // Sun icon
                <path fill="currentColor" d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-12.37c-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41zm-12.37 12.37c-.39-.39-1.02-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06c.39-.38.39-1.02 0-1.41z"/>
              ) : (
                // Moon icon (requested Mui-style Moon icon path)
                <path fill="currentColor" d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
              )}
            </svg>
            <span className="MuiTouchRipple-root css-4mb1j7"></span>
          </button>

          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-500/15 hover:shadow-indigo-500/20 transition-all hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 flex-1 flex flex-col items-center text-center relative z-10 w-full">
        <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 px-4 py-2 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Akash Camera Production Workflow
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-b dark:from-white dark:to-slate-400 tracking-tight leading-[1.15] max-w-4xl">
          One Client, One Group. <br />
          <span className="bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-600 dark:from-indigo-400 dark:to-violet-500">Supercharged.</span>
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 text-lg md:text-xl mt-6 max-w-2xl font-medium leading-relaxed">
          Manage your photography clients, event schedules, crew rosters, and live WhatsApp chats in a unified CRM system built for your production pipeline.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all hover:-translate-y-0.5 group">
            Start Extractor & CRM <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white px-8 py-4 rounded-2xl font-bold text-base transition-colors shadow-sm dark:shadow-none">
            Access Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/30 p-8 rounded-2xl text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.04] transition-all group shadow-sm dark:shadow-none">
            <div className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Live WhatsApp Chat Box</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Read historical messages and chat in real-time inside your dashboard. Never miss client requirements or team updates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/30 p-8 rounded-2xl text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.04] transition-all group shadow-sm dark:shadow-none">
            <div className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Kanban className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Visual Kanban Board</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Track projects from Pre-Prod, Editing, Revisions to Completed. Drag-and-drop client groups to update project statuses in real-time.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 hover:border-indigo-500/30 p-8 rounded-2xl text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.04] transition-all group shadow-sm dark:shadow-none">
            <div className="bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Shoot & Date Filters</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Organize hundreds of groups by event dates. Instantly filter chats and pipelines by specific months and confirm team availability.
            </p>
          </div>
        </div>

        {/* Workflow Showcase Section */}
        <div className="mt-24 w-full bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 rounded-3xl p-8 md:p-12 text-left relative overflow-hidden shadow-sm dark:shadow-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px]" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white mb-6">Built specifically for Akash Camera Production</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg mt-0.5"><Users className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-md font-bold text-slate-900 dark:text-white">Team & Crew Allocation</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Assign photographers, cinemafilm leads, and editors to each group. Persist contact information on-screen.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg mt-0.5"><ShieldAlert className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-md font-bold text-slate-900 dark:text-white">Pinned Coordinates & References</h4>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Pin drive links, client references, venue location maps, and specifications for easy accessibility.</p>
                </div>
              </div>
            </div>
            <div className="relative border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden aspect-video bg-white dark:bg-[#0b0f19]/80 shadow-lg dark:shadow-2xl flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <Smartphone className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto animate-bounce" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scan QR to connect WhatsApp Web</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">Fully compatible with linked devices authentication</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/5 py-8 text-center text-xs text-slate-500 dark:text-slate-600 relative z-10">
        <p>© 2026 Akash Camera Production WhatsACP. Powered by Advanced Agentic Coding.</p>
      </footer>
    </div>
  );
}
