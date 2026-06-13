"use client";

import Link from 'next/link';
import { MessageSquare, ArrowRight, Smartphone, Kanban, Calendar, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full bg-[#0b0f19] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">WhatsACP</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/register" className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-500/15 hover:shadow-emerald-500/20 transition-all hover:-translate-y-0.5">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-24 flex-1 flex flex-col items-center text-center relative z-10 w-full">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-semibold text-emerald-400 mb-8 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Akash Camera Production Workflow
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight leading-[1.15] max-w-4xl">
          One Client, One Group. <br />
          <span className="bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Supercharged.</span>
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl mt-6 max-w-2xl font-medium leading-relaxed">
          Manage your photography clients, event schedules, crew rosters, and live WhatsApp chats in a unified CRM system built for your production pipeline.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-10">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all hover:-translate-y-0.5 group">
            Start Extractor & CRM <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-2xl font-bold text-base transition-colors">
            Access Dashboard
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full">
          {/* Feature 1 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 p-8 rounded-2xl text-left hover:bg-white/[0.04] transition-all group">
            <div className="bg-emerald-500/10 text-emerald-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Live WhatsApp Chat Box</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Read historical messages and chat in real-time inside your dashboard. Never miss client requirements or team updates.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 p-8 rounded-2xl text-left hover:bg-white/[0.04] transition-all group">
            <div className="bg-teal-500/10 text-teal-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Kanban className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Visual Kanban Board</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track projects from Pre-Prod, Editing, Revisions to Completed. Drag-and-drop client groups to update project statuses in real-time.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 p-8 rounded-2xl text-left hover:bg-white/[0.04] transition-all group">
            <div className="bg-indigo-500/10 text-indigo-400 p-3.5 rounded-xl w-fit mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Shoot & Date Filters</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Organize hundreds of groups by event dates. Instantly filter chats and pipelines by specific months and confirm team availability.
            </p>
          </div>
        </div>

        {/* Workflow Showcase Section */}
        <div className="mt-24 w-full bg-white/[0.02] border border-white/5 rounded-3xl p-8 md:p-12 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[60px]" />
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">Built specifically for Akash Camera Production</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="flex gap-4 items-start">
                <div className="bg-emerald-500/20 text-emerald-400 p-2 rounded-lg mt-0.5"><Users className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-md font-bold text-white">Team & Crew Allocation</h4>
                  <p className="text-slate-400 text-sm mt-1">Assign photographers, cinemafilm leads, and editors to each group. Persist contact information on-screen.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg mt-0.5"><ShieldAlert className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-md font-bold text-white">Pinned Coordinates & References</h4>
                  <p className="text-slate-400 text-sm mt-1">Pin drive links, client references, venue location maps, and specifications for easy accessibility.</p>
                </div>
              </div>
            </div>
            <div className="relative border border-white/10 rounded-2xl overflow-hidden aspect-video bg-[#0b0f19]/80 shadow-2xl flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <Smartphone className="w-12 h-12 text-slate-500 mx-auto animate-bounce" />
                <p className="text-sm font-semibold text-slate-300">Scan QR to connect WhatsApp Web</p>
                <p className="text-xs text-slate-500">Fully compatible with linked devices authentication</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-600 relative z-10">
        <p>© 2026 Akash Camera Production WhatsACP. Powered by Advanced Agentic Coding.</p>
      </footer>
    </div>
  );
}
