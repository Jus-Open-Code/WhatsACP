"use client";

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function WhatsAppConnect() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'initializing' | 'waiting_qr' | 'authenticated' | 'ready'>('initializing');
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('whatsacp_backend_url') : null;
    const socketUrl = savedUrl || `http://${window.location.hostname}:3001`;
    const myClientId = typeof window !== 'undefined' ? (localStorage.getItem('whatsacp_client_id') || 'default') : 'default';
    const socket = io(socketUrl, { 
      query: { clientId: myClientId },
      transports: ['websocket', 'polling'] 
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Initially set to waiting_qr so we know it connected successfully!
      setStatus('waiting_qr');
      setQrCode(null); // Clear any previous socket connection errors
    });

    socket.on('connect_error', (err) => {
      console.error("Socket error:", err);
      // We can use qrCode state to show the error message on screen temporarily
      setQrCode(`Error: ${err.message}`);
    });

    socket.on('current_status', (data: { status: string, qr: string | null }) => {
      if (data.status === 'ready' || data.status === 'authenticated') {
        setStatus(data.status as any);
        setQrCode(null);
      } else if (data.status === 'waiting_qr') {
        setStatus('waiting_qr');
        if (data.qr) setQrCode(data.qr);
      }
    });

    socket.on('qr_code', (qr: string) => {
      setQrCode(qr);
      setStatus('waiting_qr');
    });

    socket.on('whatsapp_authenticated', () => {
      setStatus('authenticated');
      setQrCode(null);
    });

    socket.on('whatsapp_ready', () => {
      setStatus('ready');
    });

    socket.on('whatsapp_disconnected', () => {
      setStatus('waiting_qr');
      setQrCode(null);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleDisconnect = () => {
    if (socketRef.current) {
      setStatus('initializing');
      setQrCode(null);
      socketRef.current.emit('disconnect_whatsapp');
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">WhatsApp Connect</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2 font-medium">Link your WhatsApp account to automatically sync groups and messages.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800/80 flex flex-col md:flex-row gap-12 items-center hover:shadow-md transition-all duration-200">
         
         <div className="flex-1 space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">How to link your device</h3>
            <ol className="space-y-5 text-gray-600 dark:text-slate-300 font-medium">
               <li className="flex gap-4 items-start">
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</span>
                  <span className="mt-1">Open WhatsApp on your phone.</span>
               </li>
               <li className="flex items-start gap-4">
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</span>
                  <span className="mt-1">Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.</span>
               </li>
               <li className="flex items-start gap-4">
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">3</span>
                  <span className="mt-1">Tap <strong>Link a Device</strong>.</span>
               </li>
               <li className="flex items-start gap-4">
                  <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">4</span>
                  <span className="mt-1">Point your phone to this screen to capture the QR code.</span>
               </li>
            </ol>
         </div>

         <div className="w-80 h-80 bg-gray-50/50 dark:bg-slate-950/45 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
            {status === 'initializing' && (
              <div className="flex flex-col items-center text-gray-400">
                 <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                 <p className="font-semibold text-gray-600 dark:text-slate-300">Connecting to Server...</p>
                 <p className="text-xs mt-2 text-gray-400 dark:text-slate-500 text-center px-4">Ensure start_backend.bat is running.</p>
              </div>
            )}

            {status === 'waiting_qr' && !qrCode && (
              <div className="flex flex-col items-center text-gray-400">
                 <RefreshCw className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
                 <p className="font-semibold text-gray-600 dark:text-slate-300">Generating QR Code...</p>
              </div>
            )}

            {status === 'waiting_qr' && qrCode && !qrCode.startsWith('Error:') && (
              <div className="p-5 bg-white rounded-2xl shadow-sm border border-gray-100 animate-in fade-in zoom-in duration-300">
                 <QRCodeSVG value={qrCode} size={220} />
              </div>
            )}

            {status === 'waiting_qr' && qrCode && qrCode.startsWith('Error:') && (
              <div className="p-5 text-red-500 font-medium text-center animate-in fade-in zoom-in duration-300">
                 {qrCode}
                 <p className="text-sm mt-2 text-gray-500 dark:text-slate-400">Could not reach the backend engine.</p>
              </div>
            )}

            {status === 'authenticated' && (
              <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in duration-300">
                 <CheckCircle className="w-16 h-16 mb-4" />
                 <p className="font-bold text-2xl text-gray-800 dark:text-slate-100">Authenticated!</p>
                 <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 font-medium">Loading your chats...</p>
              </div>
            )}

            {status === 'ready' && (
              <div className="flex flex-col items-center text-green-500 animate-in fade-in zoom-in duration-300">
                 <CheckCircle className="w-16 h-16 mb-4" />
                 <p className="font-bold text-2xl text-gray-800 dark:text-slate-100">Connected</p>
                 <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 font-medium text-center px-4">Your WhatsApp is active and syncing groups.</p>
                 <div className="flex flex-col items-center gap-2 mt-6">
                    <a href="/groups" className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">View Groups →</a>
                    <button 
                      onClick={handleDisconnect}
                      className="text-xs text-rose-500 dark:text-rose-450 hover:text-rose-600 dark:hover:text-rose-400 font-semibold hover:underline mt-2 cursor-pointer"
                    >
                      Disconnect WhatsApp
                    </button>
                 </div>
              </div>
            )}
         </div>

      </div>
    </div>
  )
}
