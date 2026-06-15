"use client";

import { useState, useEffect } from "react";
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
  User,
  X,
  Database,
  Loader2,
  Palette,
  QrCode,
  Kanban
} from 'lucide-react';
import Link from 'next/link';
import AuthGuard from './AuthGuard';
import { supabase } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: "Akash Camera Admin",
    email: "akash@example.com",
    role: "Administrator"
  });

  const [user, setUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Local state for editing settings
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [backendUrl, setBackendUrl] = useState("https://e985ffd850ccd7.lhr.life");
  const [clientId, setClientId] = useState("default");
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
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
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    fetchUser();
  }, [pathname]);

  useEffect(() => {
    const sessionStr = localStorage.getItem('whatsacp_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        const name = session.name || "Akash Camera Admin";
        const email = session.email || "akash@example.com";
        const role = session.role || "Administrator";
        setProfile({ name, email, role });
        setEditName(name);
        setEditEmail(email);
        setEditRole(role);
      } catch (err) {}
    } else {
      setEditName("Akash Camera Admin");
      setEditEmail("akash@example.com");
      setEditRole("Administrator");
    }

    let savedUrl = localStorage.getItem('whatsacp_backend_url') || "https://e985ffd850ccd7.lhr.life";
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (savedUrl.includes("localhost") || savedUrl.includes("127.0.0.1") || savedUrl.includes("vercel.app")) {
        localStorage.removeItem('whatsacp_backend_url');
        savedUrl = "https://e985ffd850ccd7.lhr.life";
      }
    }
    setBackendUrl(savedUrl);
    const savedClientId = localStorage.getItem('whatsacp_client_id') || "default";
    setClientId(savedClientId);
  }, []);

  // Fetch WhatsApp Web service status from backend
  const checkConnection = async (url: string) => {
    try {
      const res = await fetch(`${url}/api/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ready' || data.status === 'authenticated') {
          setWhatsappStatus('connected');
        } else {
          setWhatsappStatus('disconnected');
        }
      } else {
        setWhatsappStatus('disconnected');
      }
    } catch (err) {
      setWhatsappStatus('disconnected');
    }
  };

  useEffect(() => {
    if (settingsOpen) {
      checkConnection(backendUrl);
    }
  }, [settingsOpen, backendUrl]);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    await checkConnection(backendUrl);
    setTestingConnection(false);
    toast.success("Connection status checked!");
  };

  const handleSaveSettings = () => {
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Name and Email are required");
      return;
    }

    const updatedProfile = {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole
    };

    setProfile(updatedProfile);
    
    // Save to whatsacp_session
    const sessionStr = localStorage.getItem('whatsacp_session');
    let session: any = {};
    if (sessionStr) {
      try {
        session = JSON.parse(sessionStr);
      } catch (e) {}
    }
    session.name = updatedProfile.name;
    session.email = updatedProfile.email;
    session.role = updatedProfile.role;
    localStorage.setItem('whatsacp_session', JSON.stringify(session));

    // Save Backend URL
    localStorage.setItem('whatsacp_backend_url', backendUrl);
    localStorage.setItem('whatsacp_client_id', clientId.trim() || 'default');

    toast.success("Settings saved successfully!");
    setSettingsOpen(false);
  };

  const getInitials = (name: string) => {
    if (!name) return "AC";
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

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
      <div className="min-h-screen flex w-full bg-background text-foreground font-sans overflow-hidden transition-colors duration-200">
        
        {/* REDESIGNED SIDEBAR (Matches reference Image 2) */}
        <aside 
          id="main-sidebar" 
          className="hidden md:flex bg-[#0c101b] flex-col items-start fixed left-0 top-0 h-full z-20 shadow-xl py-6 px-3 shrink-0 border-r border-slate-900/60 overflow-hidden w-20 hover:w-60 transition-[width] duration-100 ease-in-out group select-none"
        >
          
          {/* Logo: WhatsApp-style ACP icon */}
          <div className="mb-8 px-2 flex items-center gap-0 w-full cursor-pointer select-none" title="WhatsACP">
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
              <circle cx="21" cy="21" r="21" fill="#111827"/>
              <path
                d="M21 8C13.82 8 8 13.82 8 21c0 2.62.74 5.07 2.02 7.16L8 34l6.06-1.97A12.93 12.93 0 0 0 21 34c7.18 0 13-5.82 13-13S28.18 8 21 8z"
                fill="#25D366"
              />
              <text
                x="21"
                y="25"
                textAnchor="middle"
                fill="white"
                fontSize="8"
                fontWeight="900"
                fontFamily="Arial, sans-serif"
                letterSpacing="-0.5"
              >
                ACP
              </text>
            </svg>
            <span className="text-white font-black text-sm tracking-wider sidebar-label">
              WhatsACP
            </span>
          </div>

          {/* Navigation stack */}
          <nav className="flex-grow flex flex-col gap-2 w-full">
            
            {/* Core Section */}
            <div className="sidebar-header select-none">
              CRM CORE
            </div>

            {/* Dashboard */}
            <Link 
              href="/overview" 
              className={`relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 ${
                pathname === '/overview' 
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pathname === '/overview' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[4px] bg-[#25d366] rounded-r-md" />
              )}
              <LayoutDashboard className={`w-5 h-5 shrink-0 transition-transform ${pathname === '/overview' ? 'text-emerald-400' : 'text-slate-400 group-hover:scale-105'}`} />
              <span className="sidebar-label text-xs font-bold">
                Dashboard
              </span>
            </Link>

            {/* Inbox */}
            <Link 
              href="/chat" 
              className={`relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 ${
                pathname === '/chat' 
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pathname === '/chat' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[4px] bg-[#25d366] rounded-r-md" />
              )}
              <MessageSquare className={`w-5 h-5 shrink-0 transition-transform ${pathname === '/chat' ? 'text-emerald-400' : 'text-slate-400 group-hover:scale-105'}`} />
              <span className="sidebar-label text-xs font-bold">
                Inbox
              </span>
            </Link>

            {/* Group Manager */}
            <Link 
              href="/groups" 
              className={`relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 ${
                pathname === '/groups' 
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pathname === '/groups' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[4px] bg-[#25d366] rounded-r-md" />
              )}
              <Kanban className={`w-5 h-5 shrink-0 transition-transform ${pathname === '/groups' ? 'text-emerald-400' : 'text-slate-400 group-hover:scale-105'}`} />
              <span className="sidebar-label text-xs font-bold">
                Group Manager
              </span>
            </Link>

            {/* WhatsApp Integration Section */}
            <div className="sidebar-header select-none">
              WHATSAPP QR PLUGIN
            </div>

            {/* WhatsApp Setup */}
            <Link 
              href="/whatsapp" 
              className={`relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 ${
                pathname === '/whatsapp' 
                  ? 'bg-emerald-500/10 text-emerald-400 font-bold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {pathname === '/whatsapp' && (
                <div className="absolute left-0 top-2.5 bottom-2.5 w-[4px] bg-[#25d366] rounded-r-md" />
              )}
              <QrCode className={`w-5 h-5 shrink-0 transition-transform ${pathname === '/whatsapp' ? 'text-emerald-400' : 'text-slate-400 group-hover:scale-105'}`} />
              <span className="sidebar-label text-xs font-bold">
                Add WhatsApp via QR
              </span>
            </Link>

            {/* System settings and Sign out */}
            <div className="sidebar-header select-none">
              PREFERENCES
            </div>

            {/* System Settings (opens drawer) */}
            <button 
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <Settings className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105" />
              <span className="sidebar-label text-xs font-bold">
                Settings
              </span>
            </button>

            {/* Sign Out (mt-auto) */}
            <button 
              type="button" 
              onClick={handleLogout}
              className="relative flex items-center pl-[18px] group-hover:pl-4 py-3 w-full rounded-xl transition-all duration-100 cursor-pointer active:scale-95 mt-auto text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut className="w-5 h-5 shrink-0 transition-transform" />
              <span className="sidebar-label text-xs font-bold">
                Sign Out
              </span>
            </button>

          </nav>

        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-1 ml-0 md:ml-20 flex flex-col h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-200 pb-16 md:pb-0">
          
          {/* TOP BREADCRUMB BAR (Matches inbox_light.png top layout) */}
          <header className="h-14 glass-header border-b border-gray-200/50 dark:border-slate-800/50 sticky top-0 z-10 flex items-center justify-between px-6 shadow-sm shrink-0">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 font-semibold text-xs">
              <Home className="w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors" />
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer transition-colors">{getPageName()}</span>
            </div>
            
            {/* Profile Initials & Settings & Dark Mode Toggle */}
            <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400">

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


              {/* User Avatar button */}
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="relative focus:outline-none cursor-pointer flex-shrink-0"
              >
                {user?.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    alt={user.user_metadata.full_name || "User Avatar"} 
                    className="w-8 h-8 rounded-full shadow-inner select-none object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-[10px] shadow-inner select-none">
                    {getInitials(user?.user_metadata?.full_name || profile.name)}
                  </div>
                )}
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <>
                  {/* Click outside backdrop */}
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                  
                  <div className="absolute right-0 top-10 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left font-sans">
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                      {user?.user_metadata?.avatar_url ? (
                        <img 
                          src={user.user_metadata.avatar_url} 
                          alt="Avatar" 
                          className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                          {getInitials(user?.user_metadata?.full_name || profile.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.user_metadata?.full_name || profile.name}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{user?.email || profile.email}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                        System Settings
                      </button>
                      <button 
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors text-left cursor-pointer mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </header>
          
          {/* Main child viewport */}
          <div className={`flex-1 flex flex-col overflow-hidden ${pathname === '/chat' ? 'p-0' : 'p-8 overflow-y-auto'}`}>
             <AnimatePresence mode="wait">
               <motion.div
                 key={pathname}
                 initial={{ opacity: 0, y: 8 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -8 }}
                 transition={{ duration: 0.12, ease: "easeInOut" }}
                 className="flex-1 flex flex-col overflow-hidden h-full w-full"
               >
                 {children}
               </motion.div>
             </AnimatePresence>
          </div>
        </main>
      </div>

      {/* SETTINGS DRAWER */}
      <AnimatePresence>
        {settingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 cursor-pointer"
            />
            {/* Drawer */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 flex flex-col font-sans text-slate-800 dark:text-slate-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg tracking-tight">System Settings</h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">Configure profile & service integrations</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Account / Admin Profile */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4 text-indigo-500" />
                    <span>Administrator Profile</span>
                  </div>
                  
                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
                      <input 
                        type="text" 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        placeholder="Akash Kumar"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                      <input 
                        type="email" 
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        placeholder="akash@example.com"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Role</label>
                      <select 
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer"
                      >
                        <option value="Administrator">Administrator</option>
                        <option value="Editor">Editor</option>
                        <option value="Production Manager">Production Manager</option>
                        <option value="Photographer">Photographer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Web Engine Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <Smartphone className="w-4 h-4 text-indigo-500" />
                    <span>WhatsApp Web Integration</span>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Backend Service URL</label>
                      <input 
                        type="text" 
                        value={backendUrl}
                        onChange={(e) => setBackendUrl(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        placeholder="http://localhost:3001"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">WhatsApp Session ID (Client ID)</label>
                      <input 
                        type="text" 
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
                        placeholder="e.g. user_session_1"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">Allows multiple team members to connect different WhatsApp numbers on the same server.</p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Status:</span>
                        {whatsappStatus === 'connected' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : whatsappStatus === 'checking' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-orange-500 font-bold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Checking
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-rose-500 font-bold">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            Offline
                          </span>
                        )}
                      </div>
                      <button 
                        type="button"
                        onClick={handleTestConnection}
                        disabled={testingConnection}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {testingConnection ? "Pinging..." : "Test Ping"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Appearance & Theme Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <Palette className="w-4 h-4 text-indigo-500" />
                    <span>Appearance & Theme</span>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dark Theme</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Switch between light and dark aesthetics.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={toggleTheme}
                      className={`w-11 h-6 rounded-full relative transition-colors duration-250 cursor-pointer ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'}`}
                    >
                      <motion.div 
                        layout
                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        animate={{ x: theme === 'dark' ? 20 : 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>
                </div>

                {/* Database (Supabase) status */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <Database className="w-4 h-4 text-indigo-500" />
                    <span>Database Configuration</span>
                  </div>

                  <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Offline Fallback State</span>
                      <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/20">Active (Auto)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                      The dashboard automatically falls back to local database variables if Supabase config is missing from your <code className="font-mono bg-slate-100 dark:bg-slate-900 px-1 rounded">.env.local</code>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/10 shrink-0">
                <button 
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/10 transition hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* MOBILE BOTTOM NAV — visible only on mobile */}
      {!isPublicPage && (
        <nav className="fixed bottom-0 w-full z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center h-16 px-4 shadow-lg">
          <Link href="/overview" className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${pathname === '/overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Overview</span>
          </Link>
          <Link href="/chat" className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${pathname === '/chat' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <MessageSquare className="w-5 h-5" />
            <span>Inbox</span>
          </Link>
          <Link href="/whatsapp" className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${pathname === '/whatsapp' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <Smartphone className="w-5 h-5" />
            <span>WhatsApp</span>
          </Link>
          <Link href="/groups" className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${pathname === '/groups' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
            <Users className="w-5 h-5" />
            <span>Groups</span>
          </Link>
          <button onClick={() => setSettingsOpen(true)} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
            <User className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </nav>
      )}
    </AuthGuard>
  );
}
