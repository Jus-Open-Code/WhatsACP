"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check Supabase session
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      } catch (err) {
        // Safe catch if supabase URL is a placeholder or has issue
      }
      
      // 2. Check Local Storage fallback session
      const localSession = typeof window !== 'undefined' ? localStorage.getItem('whatsacp_session') : null;

      if (!session && !localSession) {
        // Redirect to login if unauthenticated and not on public pages
        if (pathname !== '/' && pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
        } else {
          setLoading(false);
        }
      } else {
        // Authenticated! Redirect to dashboard if trying to access public landing or login/register pages
        if (pathname === '/' || pathname === '/login' || pathname === '/register') {
          router.replace('/overview');
        } else {
          setLoading(false);
        }
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 mb-4" />
        <p className="font-semibold text-sm">Verifying Session...</p>
      </div>
    );
  }

  return <>{children}</>;
}
