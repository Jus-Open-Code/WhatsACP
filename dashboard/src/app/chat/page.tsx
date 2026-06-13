"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { supabase } from "@/utils/supabase/client";
import { 
  Search, 
  Send, 
  Calendar, 
  MessageSquare, 
  Info, 
  Pin, 
  Users, 
  Check, 
  X, 
  Download, 
  Clipboard, 
  Play, 
  Plus, 
  Trash2, 
  Loader2, 
  User, 
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Paperclip,
  Smile,
  ArrowUpRight,
  ArrowDownLeft,
  FolderHeart,
  FileText,
  FileDown,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface Project {
  id: string;
  whatsapp_group_id: string;
  group_name: string;
  status: string;
  event_month: string;
  created_at: string;
}

interface Message {
  id: string;
  body: string;
  timestamp: number;
  from: string;
  fromMe: boolean;
  senderName: string;
  hasMedia?: boolean;
  quotedBody?: string;
  quotedSender?: string;
  ack?: number;
}

interface CrewItem {
  id: string;
  name: string;
  role: string;
  phone: string;
}

interface PinnedMessage {
  id: string;
  text: string;
  timestamp: string;
}

interface Participant {
  phone: string;
  savedName: string;
  displayName: string;
  isAdmin: boolean;
}

const cannedReplies = [
  { label: "Welcome", text: "Hello! Welcome to our studio. How can we help you today?" },
  { label: "Pricing Packages", text: "Here are our current wedding photography and videography packages:\n- Gold Package: 1.5 Lakhs (Cinematography + Album)\n- Diamond Package: 2.5 Lakhs (Cinematography + Album + Drone + Pre-wedding)" },
  { label: "Studio Address", text: "Our Studio Address:\n123, Creative Street, Film City, Mumbai.\nGoogle Maps: https://maps.google.com" },
  { label: "Payment Details", text: "Bank Payment Details:\nBank: HDFC Bank\nAccount: 50200012345678\nIFSC: HDFC0001234\nName: Akash Camera Production" },
  { label: "Next Steps", text: "To confirm your booking, please:\n1. Send event date & venue details\n2. Transfer 25% booking advance\n3. Share contact info of family coordinators" }
];

const enhanceTextWithAi = (text: string, tone: 'professional' | 'polite' | 'crisp' | 'schedule') => {
  if (!text.trim()) {
    if (tone === 'professional') return "Hello! I hope you are having a wonderful day. Please let me know how we can assist you with your project.";
    if (tone === 'polite') return "Hi there! We would love to help you plan your upcoming shoot. Let us know your requirements. 😊";
    if (tone === 'crisp') return "Welcome to Akash Camera Production. Let us know how we can help.";
    return "Let's schedule a meeting. What date and time works best for you?";
  }

  let polished = text;

  // Simple template rewrites for standard CRM conversations
  polished = polished.replace(/\bok\b/gi, "Sure, that sounds great");
  polished = polished.replace(/\bdone\b/gi, "completed successfully");
  polished = polished.replace(/\bcall me\b/gi, "please feel free to call me at your convenience");
  polished = polished.replace(/\bprice\b/gi, "package pricing details");
  polished = polished.replace(/\baddress\b/gi, "studio address location");
  polished = polished.replace(/\bdiscount\b/gi, "custom pricing adjustment");
  polished = polished.replace(/\bpayment\b/gi, "booking advance payment");

  if (tone === 'professional') {
    return `Hello,\n\n${polished.charAt(0).toUpperCase() + polished.slice(1)}.\n\nPlease let me know if you have any questions.\n\nWarm regards,\nAkash Camera Production`;
  }
  if (tone === 'polite') {
    return `Hi there! 😊\n\n${polished.charAt(0).toUpperCase() + polished.slice(1)}.\n\nLooking forward to working together! ✨`;
  }
  if (tone === 'crisp') {
    return `${polished.charAt(0).toUpperCase() + polished.slice(1)}.`;
  }
  if (tone === 'schedule') {
    return `Hi! Regarding our upcoming project:\n\n📅 Event details: ${polished}\n\nLet's confirm the date and proceed with scheduling. Thanks!`;
  }

  return polished;
};

export default function ChatPage() {
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("whatsacp_cached_projects");
      return cached ? JSON.parse(cached) : [];
    }
    return [];
  });
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mediaData, setMediaData] = useState<Record<string, { mimetype: string; data: string; filename?: string; error?: string; loading?: boolean }>>({});
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  
  // Inbox Left filter tabs: 'all' | 'unread' | 'read'
  const [inboxStatusFilter, setInboxStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  
  // Right Drawer Primary state
  const [drawerOpen, setDrawerOpen] = useState(true);
  
  // Accordions open/close state
  const [accordionOpen, setAccordionOpen] = useState({
    contact: true,
    labels: true,
    crew: true,
    notes: true,
    exporter: false,
    shared: false,
    activity: false
  });
  
  // Brief Board fields
  const [projectStatus, setProjectStatus] = useState("Unassigned");
  const [projectMonth, setProjectMonth] = useState("");
  const [eventDateVal, setEventDateVal] = useState("");
  
  const [crewList, setCrewList] = useState<CrewItem[]>([]);
  const [crewNameInput, setCrewNameInput] = useState("");
  const [crewRoleInput, setCrewRoleInput] = useState("");
  const [crewPhoneInput, setCrewPhoneInput] = useState("");

  const [pinnedList, setPinnedList] = useState<PinnedMessage[]>([]);

  // Exporter fields
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'extracting' | 'completed' | 'error'>('idle');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [copiedNumbers, setCopiedNumbers] = useState(false);

  // WebSockets
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, string>>({});
  const [lastMessageTimestamps, setLastMessageTimestamps] = useState<Record<string, number>>({});
  const [profilePics, setProfilePics] = useState<Record<string, string>>({});
  const requestedPicsRef = useRef<Set<string>>(new Set());

  // Additional WhatsApp Web core features states
  const [groupMembers, setGroupMembers] = useState<Participant[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [typingStatus, setTypingStatus] = useState<Record<string, boolean>>({});
  const [onlineStatus, setOnlineStatus] = useState<Record<string, { isOnline: boolean; lastSeen?: number | null }>>({});
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [isChatSearching, setIsChatSearching] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [cannedRepliesOpen, setCannedRepliesOpen] = useState(false);
  const [customNoteInput, setCustomNoteInput] = useState("");
  const [filterTab, setFilterTab] = useState<'Monthly' | 'Yearly' | 'Custom' | 'Dynamic'>('Monthly');
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [customFilterApplied, setCustomFilterApplied] = useState(false);
  const [dynamicFilter, setDynamicFilter] = useState("This Month");
  const [aiPopoverOpen, setAiPopoverOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [selectedFilterMonth, setSelectedFilterMonth] = useState<number>(new Date().getMonth());
  const [selectedFilterYear, setSelectedFilterYear] = useState<number>(2026);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [decadeStartYear, setDecadeStartYear] = useState<number>(2020);
  const [monthlyYearlyFilterApplied, setMonthlyYearlyFilterApplied] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const toggleAccordion = (section: keyof typeof accordionOpen) => {
    setAccordionOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fallback client-side Supabase fetch (runs if WebSocket fails to fetch projects)
  const fetchProjectsFallback = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
      if (data && data.length > 0) {
        localStorage.setItem("whatsacp_cached_projects", JSON.stringify(data));
      }
    } catch (err: any) {
      console.warn("Fallback fetch projects error:", err.message);
      // Fallback to localStorage cache if network is completely down
      if (typeof window !== "undefined") {
        const cached = localStorage.getItem("whatsacp_cached_projects");
        if (cached) {
          try {
            setProjects(JSON.parse(cached));
          } catch (e) {
            // ignore
          }
        }
      }
    }
  };

  // Sync details when active project changes
  useEffect(() => {
    if (activeProject) {
      const jid = activeProject.whatsapp_group_id;

      // 1. Load project status and date values
      setProjectStatus(activeProject.status || "Unassigned");
      setProjectMonth(activeProject.event_month || "");
      
      // Load Datepicker val from localStorage if saved
      const savedDate = localStorage.getItem(`brief_date_${jid}`) || "";
      setEventDateVal(savedDate);

      // 2. Load Crew List (JSON format)
      try {
        const savedCrew = localStorage.getItem(`brief_crew_${jid}`);
        setCrewList(savedCrew ? JSON.parse(savedCrew) : []);
      } catch (err) {
        setCrewList([]);
      }

      // 3. Load Pinned Messages (from Socket Database instead of localStorage)
      if (socket && connected) {
        socket.emit("get_pinned_notes", { chatId: jid });
      } else {
        setPinnedList([]);
      }

      // Reset Member Exporter view states
      setParticipants([]);
      setExtractionStatus('idle');
      setExtractionProgress(0);
      
      // Clear unread badge
      setUnreadCounts(prev => ({ ...prev, [jid]: 0 }));
      
      // Request messages for this chat
      if (socket && connected) {
        socket.emit("get_chat_messages", { chatId: jid });
        
        // Auto-fetch group members in background if group
        if (jid.endsWith('@g.us')) {
          setGroupMembers([]);
          socket.emit("get_group_participants", { chatId: jid });
        } else {
          setGroupMembers([]);
          // Fetch online status for personal contact
          socket.emit("get_online_status", { chatId: jid });
        }
      }

      // Reset features states
      setReplyingTo(null);
      setChatSearchQuery("");
      setIsChatSearching(false);
      setEmojiPickerOpen(false);
    }
  }, [activeProject, socket, connected]);

  // Setup WebSocket connection
  useEffect(() => {
    const socketUrl = `http://${window.location.hostname}:3001`;
    const socketClient = io(socketUrl);

    socketClient.on("connect", () => {
      setConnected(true);
      setSocket(socketClient);
      
      // Request group list over socket immediately (bypasses RLS)
      socketClient.emit("get_projects");
    });

    socketClient.on("disconnect", () => {
      setConnected(false);
    });

    socketClient.on("connect_error", () => {
      setConnected(false);
      fetchProjectsFallback();
    });

    // Handle projects response from socket server
    socketClient.on("projects_response", (data: { projects: Project[]; error?: string }) => {
      if (data.error) {
        console.warn("Socket projects fetch error (using cache fallback):", data.error);
        fetchProjectsFallback();
      } else {
        setProjects(data.projects || []);
        if (data.projects && data.projects.length > 0) {
          localStorage.setItem("whatsacp_cached_projects", JSON.stringify(data.projects));
        }
      }
    });

    socketClient.on("profile_pic_response", (data: { chatId: string; url: string }) => {
      setProfilePics(prev => ({ ...prev, [data.chatId]: data.url }));
    });

    // Handle update project success from socket
    socketClient.on("update_project_success", (data: { jid: string; project: Project }) => {
      toast.success("Brief Board details saved!");
      
      setProjects(prev => prev.map(p => {
        if (p.whatsapp_group_id === data.jid) {
          return { ...p, status: data.project.status, event_month: data.project.event_month };
        }
        return p;
      }));

      setActiveProject(prev => prev && prev.whatsapp_group_id === data.jid ? { 
        ...prev, 
        status: data.project.status, 
        event_month: data.project.event_month 
      } : prev);
    });

    socketClient.on("update_project_error", (data: { jid: string; error: string }) => {
      toast.error(`Failed to update project: ${data.error}`);
    });

    // Handle historical messages response
    socketClient.on("chat_messages_response", (data: { chatId: string; messages: Message[]; error?: string }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        setMessages(data.messages || []);
        if (data.messages && data.messages.length > 0) {
          const lastMsg = data.messages[data.messages.length - 1];
          setLastMessages(prev => ({ ...prev, [data.chatId]: lastMsg.body }));
          setLastMessageTimestamps(prev => ({ ...prev, [data.chatId]: lastMsg.timestamp }));
        }
      }
    });

    // Handle message sending status
    socketClient.on("send_chat_message_success", (data: { chatId: string; message: Message }) => {
      toast.dismiss(); // Dismiss the media sending loader
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        setMessages(prev => [...prev, data.message]);
      }
      setLastMessages(prev => ({ ...prev, [data.chatId]: data.message.body }));
      setLastMessageTimestamps(prev => ({ ...prev, [data.chatId]: data.message.timestamp }));
    });

    socketClient.on("send_chat_message_error", (data: { chatId: string; error: string }) => {
      toast.error(`Message failed: ${data.error}`);
    });

    // Handle streaming incoming messages
    socketClient.on("incoming_message", (data: { chatId: string; message: Message }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        setMessages(prev => [...prev, data.message]);
      } else {
        setUnreadCounts(prev => ({
          ...prev,
          [data.chatId]: (prev[data.chatId] || 0) + 1
        }));
      }
      setLastMessages(prev => ({ ...prev, [data.chatId]: data.message.body }));
      setLastMessageTimestamps(prev => ({ ...prev, [data.chatId]: data.message.timestamp }));
    });

    // Handle on-demand chat media download
    socketClient.on("chat_media_response", (data: { messageId: string; media?: { mimetype: string; data: string; filename?: string }; error?: string }) => {
      toast.dismiss();
      if (data.error) {
        toast.error(`Media download failed: ${data.error}`);
        setMediaData(prev => ({ ...prev, [data.messageId]: { mimetype: "", data: "", error: data.error, loading: false } }));
      } else if (data.media) {
        setMediaData(prev => ({ 
          ...prev, 
          [data.messageId]: { 
            mimetype: data.media!.mimetype, 
            data: data.media!.data, 
            filename: data.media!.filename || undefined, 
            error: undefined, 
            loading: false 
          } 
        }));
      }
    });

    // Handle database-backed pinned notes responses
    socketClient.on("pinned_notes_response", (data: { chatId: string; notes: any[]; error?: string }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        const mapped = (data.notes || []).map(note => ({
          id: note.id,
          text: note.content,
          timestamp: new Date(note.created_at).toLocaleDateString() + ' ' + new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setPinnedList(mapped);
      }
    });

    socketClient.on("pinned_note_added", (data: { chatId: string; note: any }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        const mappedNote = {
          id: data.note.id,
          text: data.note.content,
          timestamp: new Date(data.note.created_at).toLocaleDateString() + ' ' + new Date(data.note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setPinnedList(prev => [...prev, mappedNote]);
      }
    });

    socketClient.on("pinned_note_deleted", (data: { chatId: string; noteId: string }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        setPinnedList(prev => prev.filter(note => note.id !== data.noteId));
      }
    });

    socketClient.on("pinned_note_error", (data: { error: string }) => {
      toast.error(`Pinned note failed: ${data.error}`);
    });

    // Handle group participants retrieval (Member Exporter & Auto group list)
    socketClient.on("group_participants_response", (data: { chatId: string; participants: Participant[]; error?: string }) => {
      if (activeProject && data.chatId === activeProject.whatsapp_group_id) {
        if (!data.error) {
          setParticipants(data.participants || []);
          setGroupMembers(data.participants || []);
          setExtractionStatus('completed');
          setExtractionProgress(100);
        } else {
          setExtractionStatus('error');
        }
      }
    });

    socketClient.on("typing_status", (data: { chatId: string; isTyping: boolean }) => {
      setTypingStatus(prev => ({ ...prev, [data.chatId]: data.isTyping }));
    });

    socketClient.on("online_status_response", (data: { chatId: string; isOnline: boolean; lastSeen?: number | null }) => {
      setOnlineStatus(prev => ({ ...prev, [data.chatId]: { isOnline: data.isOnline, lastSeen: data.lastSeen } }));
    });

    socketClient.on("message_ack", (data: { chatId: string; messageId: string; ack: number }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, ack: data.ack } : m));
    });

    return () => {
      socketClient.disconnect();
    };
  }, [activeProject]);

  // Auto scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Start direct personal chat with a group member
  const startDirectChat = (member: Participant) => {
    const targetJid = `${member.phone}@c.us`;
    const existing = projects.find(p => p.whatsapp_group_id === targetJid);
    if (existing) {
      setActiveProject(existing);
    } else {
      const newChat: Project = {
        id: 'temp_' + member.phone,
        whatsapp_group_id: targetJid,
        group_name: member.savedName || member.displayName || `+${member.phone}`,
        status: 'Unassigned',
        event_month: 'Direct Chat',
        created_at: new Date().toISOString()
      };
      setProjects(prev => [newChat, ...prev]);
      setActiveProject(newChat);
    }
  };

  // Handle Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeProject || !socket || !connected) return;

    socket.emit("send_chat_message", {
      chatId: activeProject.whatsapp_group_id,
      text: inputText.trim(),
      quotedMessageId: replyingTo ? replyingTo.id : undefined
    });

    setInputText("");
    setReplyingTo(null);
  };

  // Handle File upload sending
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProject || !socket || !connected) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      socket.emit("send_chat_media", {
        chatId: activeProject.whatsapp_group_id,
        base64Data,
        filename: file.name,
        mimetype: file.type,
        caption: ""
      });
      toast.loading("Sending media file...");
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  // Inline Pining of a Message from Chat Pane
  const handlePinChatMessage = (text: string) => {
    if (!activeProject) return;
    const jid = activeProject.whatsapp_group_id;

    if (socket && connected) {
      socket.emit("add_pinned_note", { chatId: jid, content: text });
      toast.success("Pinned to Brief Board!");
    } else {
      const newPin: PinnedMessage = {
        id: Math.random().toString(36).substring(2, 9),
        text: text,
        timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const updatedPins = [...pinnedList, newPin];
      setPinnedList(updatedPins);
      localStorage.setItem(`brief_pins_${jid}`, JSON.stringify(updatedPins));
      toast.success("Pinned to Brief Board (Offline)!");
    }
  };

  // Save changes to Supabase & LocalStorage
  const handleSaveBriefDetails = async () => {
    if (!activeProject) return;
    const jid = activeProject.whatsapp_group_id;

    try {
      if (socket && connected) {
        socket.emit("update_project", { jid, status: projectStatus, event_month: projectMonth });
      } else {
        const { error } = await supabase
          .from("projects")
          .update({
            status: projectStatus,
            event_month: projectMonth
          })
          .eq("whatsapp_group_id", jid);

        if (error) throw error;
        
        toast.success("Brief Board details saved (offline fallback)!");
        setProjects(prev => prev.map(p => {
          if (p.whatsapp_group_id === jid) {
            return { ...p, status: projectStatus, event_month: projectMonth };
          }
          return p;
        }));
        setActiveProject(prev => prev ? { ...prev, status: projectStatus, event_month: projectMonth } : null);
      }

      localStorage.setItem(`brief_date_${jid}`, eventDateVal);
      localStorage.setItem(`brief_crew_${jid}`, JSON.stringify(crewList));
    } catch (err: any) {
      toast.error(err.message || "Failed to save details");
    }
  };

  // Date picker handler: auto calculates month/year
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateVal = e.target.value;
    setEventDateVal(dateVal);

    if (dateVal) {
      const dateObj = new Date(dateVal);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthStr = months[dateObj.getMonth()];
      const yearStr = dateObj.getFullYear().toString().substring(2); // e.g. "24"
      
      setProjectMonth(`${monthStr} ${yearStr}`);
    } else {
      setProjectMonth("");
    }
  };

  // Crew Actions
  const handleAddCrewMember = () => {
    if (!crewNameInput.trim() || !crewRoleInput.trim()) {
      toast.error("Name and Role are required");
      return;
    }

    const newItem: CrewItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: crewNameInput.trim(),
      role: crewRoleInput.trim(),
      phone: crewPhoneInput.trim() || "No Phone"
    };

    const updatedCrew = [...crewList, newItem];
    setCrewList(updatedCrew);
    
    setCrewNameInput("");
    setCrewRoleInput("");
    setCrewPhoneInput("");
  };

  const handleDeleteCrewMember = (id: string) => {
    const updatedCrew = crewList.filter(item => item.id !== id);
    setCrewList(updatedCrew);
  };

  // Pins Actions
  const handleDeletePinnedMessage = (id: string) => {
    if (!activeProject) return;
    const jid = activeProject.whatsapp_group_id;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid && socket && connected) {
      socket.emit("delete_pinned_note", { noteId: id, chatId: jid });
    } else {
      const updatedPins = pinnedList.filter(item => item.id !== id);
      setPinnedList(updatedPins);
      localStorage.setItem(`brief_pins_${jid}`, JSON.stringify(updatedPins));
      toast.success("Deleted from Board!");
    }
  };

  // Export chat transcript to .txt file
  const handleExportTranscript = () => {
    if (!activeProject || messages.length === 0) {
      toast.error("No messages to export");
      return;
    }

    const lines = [
      `WhatsACP Chat Transcript`,
      `Conversation: ${activeProject.group_name}`,
      `ID: ${activeProject.whatsapp_group_id}`,
      `Exported At: ${new Date().toLocaleString()}`,
      `=========================================`,
      ""
    ];

    messages.forEach(msg => {
      const timeStr = new Date(msg.timestamp * 1000).toLocaleString();
      const sender = msg.fromMe ? "Me" : msg.senderName;
      lines.push(`[${timeStr}] ${sender}: ${msg.body}`);
      if (msg.hasMedia) {
        lines.push(`[${timeStr}] ${sender}: [Attached File/Media]`);
      }
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = activeProject.group_name.replace(/[^\w\s-]/g, '').trim() || "transcript";
    link.download = `${safeName}_chat_transcript.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Transcript exported successfully!");
  };

  // AI message enhancement handler
  const handleAiEnhance = (tone: 'professional' | 'polite' | 'crisp' | 'schedule') => {
    setIsAiLoading(true);
    setAiPopoverOpen(false);
    
    // Simulate AI loading delay
    setTimeout(() => {
      const polished = enhanceTextWithAi(inputText, tone);
      setInputText(polished);
      setIsAiLoading(false);
      toast.success(`Polished in ${tone.toUpperCase()} tone! ✨`);
    }, 800);
  };

  // Exporter Actions
  const handleStartExtraction = () => {
    if (!activeProject || !socket || !connected) return;

    setExtractionStatus('extracting');
    setExtractionProgress(30);
    socket.emit("get_group_participants", { chatId: activeProject.whatsapp_group_id });

    setTimeout(() => setExtractionProgress(70), 500);
  };

  const handleCopyNumbers = () => {
    if (participants.length === 0) return;
    const numbers = participants.map(p => p.phone).join(",");
    navigator.clipboard.writeText(numbers).then(() => {
      setCopiedNumbers(true);
      toast.success("Phone numbers copied to clipboard!");
      setTimeout(() => setCopiedNumbers(false), 2000);
    });
  };

  const handleExportCSV = () => {
    if (participants.length === 0) return;

    const headers = ["Phone Number", "Saved Contact Name", "Display Name", "Is Admin"];
    const rows = participants.map(p => [
      `="${p.phone}"`,
      p.savedName || '',
      p.displayName || '',
      p.isAdmin ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const safeGroupName = activeProject?.group_name.replace(/[^\w\s-]/g, '').trim() || 'WhatsAppGroup';
    const timestamp = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `${safeGroupName}_contacts_${timestamp}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to parse "MMM YYYY" or "MMM YY" into a Date object for chronological sorting
  const parseMonthYear = (str: string) => {
    if (!str) return new Date(0);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const cleanStr = str.replace(/[\s,]+/g, ' ').trim();
    const parts = cleanStr.split(' ');
    
    let monthName = '';
    let yearNum = 0;
    
    for (const part of parts) {
      const idx = months.findIndex(m => part.toLowerCase().startsWith(m.toLowerCase()));
      if (idx !== -1) {
        monthName = months[idx];
      } else {
        const num = parseInt(part);
        if (!isNaN(num)) {
          if (num > 100) {
            yearNum = num;
          } else if (num > 20 && num < 99) {
            yearNum = 2000 + num;
          }
        }
      }
    }
    
    if (monthName && yearNum) {
      return new Date(yearNum, months.indexOf(monthName), 1);
    }
    
    const parsedTime = Date.parse(cleanStr);
    if (!isNaN(parsedTime)) {
      return new Date(parsedTime);
    }
    
    return new Date(0);
  };

  // Unique months logic sorted chronologically
  const uniqueMonths = Array.from(
    new Set(
      projects
        .map(p => p.event_month)
        .filter(m => m && m !== "Unknown" && m !== "Direct Chat")
    )
  ).sort((a, b) => parseMonthYear(a).getTime() - parseMonthYear(b).getTime());

  // Filtered projects list based on Stage, Date Tabs, Search, and Read/Unread Pills
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.group_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    
    // Evaluate matchesDate depending on active filterTab
    let matchesDate = true;
    if (filterTab === 'Monthly') {
      if (monthlyYearlyFilterApplied) {
        const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const targetStr = `${monthsShort[selectedFilterMonth]} ${selectedFilterYear}`;
        matchesDate = p.event_month === targetStr;
      }
    } else if (filterTab === 'Yearly') {
      if (monthlyYearlyFilterApplied) {
        matchesDate = p.event_month?.endsWith(selectedFilterYear.toString()) || false;
      }
    } else if (filterTab === 'Custom') {
      if (customFilterApplied) {
        const projectDateStr = localStorage.getItem(`brief_date_${p.whatsapp_group_id}`);
        if (projectDateStr) {
          const pDate = new Date(projectDateStr);
          pDate.setHours(0,0,0,0);
          
          if (customStartDate) {
            const start = new Date(customStartDate);
            start.setHours(0,0,0,0);
            if (pDate < start) matchesDate = false;
          }
          if (customEndDate) {
            const end = new Date(customEndDate);
            end.setHours(0,0,0,0);
            if (pDate > end) matchesDate = false;
          }
        } else {
          matchesDate = false;
        }
      }
    } else if (filterTab === 'Dynamic') {
      const projectDateStr = localStorage.getItem(`brief_date_${p.whatsapp_group_id}`);
      const now = new Date();
      
      if (dynamicFilter === 'This Month') {
        if (projectDateStr) {
          const pDate = new Date(projectDateStr);
          matchesDate = pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
        } else {
          matchesDate = false;
        }
      } else if (dynamicFilter === 'Last Month') {
        if (projectDateStr) {
          const pDate = new Date(projectDateStr);
          const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
          const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          matchesDate = pDate.getMonth() === lastMonth && pDate.getFullYear() === year;
        } else {
          matchesDate = false;
        }
      } else if (dynamicFilter === 'Next Month') {
        if (projectDateStr) {
          const pDate = new Date(projectDateStr);
          const nextMonth = now.getMonth() === 11 ? 0 : now.getMonth() + 1;
          const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
          matchesDate = pDate.getMonth() === nextMonth && pDate.getFullYear() === year;
        } else {
          matchesDate = false;
        }
      } else if (dynamicFilter === 'This Year') {
        if (projectDateStr) {
          const pDate = new Date(projectDateStr);
          matchesDate = pDate.getFullYear() === now.getFullYear();
        } else {
          matchesDate = false;
        }
      } else if (dynamicFilter === 'Direct Chats') {
        matchesDate = p.event_month === 'Direct Chat';
      } else if (dynamicFilter === 'Unknown') {
        matchesDate = p.event_month === 'Unknown' || !p.event_month;
      }
    }
    
    // Read/Unread filters based on unreadCounts state
    const unreadCount = unreadCounts[p.whatsapp_group_id] || 0;
    let matchesInboxStatus = true;
    if (inboxStatusFilter === 'unread') {
      matchesInboxStatus = unreadCount > 0;
    } else if (inboxStatusFilter === 'read') {
      matchesInboxStatus = unreadCount === 0;
    }

    return matchesSearch && matchesStatus && matchesDate && matchesInboxStatus;
  });

  // Inbox Triage: sort by unread count first (floating them to top), then by last message timestamp / creation timestamp
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const unreadA = unreadCounts[a.whatsapp_group_id] || 0;
    const unreadB = unreadCounts[b.whatsapp_group_id] || 0;

    // 1. Unread chats float to the top
    if (unreadA > 0 && unreadB === 0) return -1;
    if (unreadB > 0 && unreadA === 0) return 1;

    // 2. Otherwise sort by last message timestamp (most recent first)
    const timeA = lastMessageTimestamps[a.whatsapp_group_id] || (new Date(a.created_at).getTime() / 1000);
    const timeB = lastMessageTimestamps[b.whatsapp_group_id] || (new Date(b.created_at).getTime() / 1000);

    return timeB - timeA;
  });

  // Fetch missing profile pictures for visible sorted projects in background
  useEffect(() => {
    if (socket && connected && sortedProjects.length > 0) {
      sortedProjects.forEach(project => {
        const jid = project.whatsapp_group_id;
        if (!profilePics[jid] && !requestedPicsRef.current.has(jid)) {
          requestedPicsRef.current.add(jid);
          socket.emit('get_profile_pic', { chatId: jid });
        }
      });
    }
  }, [sortedProjects, socket, connected, profilePics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Unassigned": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Pre-Prod": return "bg-amber-50 text-amber-700 border-amber-200";
      case "Production": return "bg-blue-50 text-blue-700 border-blue-200";
      case "Editing": return "bg-purple-50 text-purple-700 border-purple-200";
      case "Revisions": return "bg-pink-50 text-pink-700 border-pink-200";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-white">
      
      {/* LEFT PANE: Chat Inbox Sidebar */}
      <div className="w-[340px] border-r border-slate-200 bg-white flex flex-col shrink-0">
        
        {/* Inbox header title & icons */}
        <div className="p-4 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-gray-800">Inbox</h2>
          <div className="flex items-center gap-3 text-slate-400">
            <button className="hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
            <div className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{connected ? 'Live' : 'Off'}</span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 py-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Inbox pills filter: All, Unread, Read */}
          <div className="flex gap-1.5 border-b border-slate-100 pb-2">
            <button
              onClick={() => setInboxStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                inboxStatusFilter === 'all' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setInboxStatusFilter('unread')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                inboxStatusFilter === 'unread' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setInboxStatusFilter('read')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                inboxStatusFilter === 'read' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Read
            </button>
          </div>

          {/* Advanced filters dropdowns */}
          <div className="space-y-2.5 pb-2.5 border-b border-slate-100/60">
            <div>
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stage</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-[11px] bg-slate-50 border border-slate-200 p-1.5 rounded-lg focus:outline-none text-slate-700 font-semibold cursor-pointer"
              >
                <option value="All">All Stages</option>
                <option value="Unassigned">Unassigned</option>
                <option value="Pre-Prod">Pre-Prod</option>
                <option value="Production">Production</option>
                <option value="Editing">Editing</option>
                <option value="Revisions">Revisions</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            {/* Shoot Date Tabs Filter */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Shoot Date Filter</label>
              
              {/* Tab Pills */}
              <div className="flex bg-[#1e222b] border border-slate-700/35 p-0.5 rounded-lg text-slate-400 font-semibold text-[10px] gap-1 select-none">
                {(['Monthly', 'Yearly', 'Custom', 'Dynamic'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setFilterTab(tab);
                      if (tab !== 'Custom') {
                        setCustomFilterApplied(false);
                      }
                    }}
                    className={`flex-1 py-1 rounded-md transition text-center cursor-pointer text-[9px] ${
                      filterTab === tab 
                        ? 'bg-[#2b303c] text-white font-bold shadow-sm' 
                        : 'hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Sub-inputs container */}
              <div className="pt-1">
                {filterTab === 'Monthly' && (() => {
                  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                  
                  const navigateMonth = (direction: 'prev' | 'next') => {
                    let newMonth = selectedFilterMonth;
                    let newYear = selectedFilterYear;
                    if (direction === 'prev') {
                      if (selectedFilterMonth === 0) {
                        newMonth = 11;
                        newYear = selectedFilterYear - 1;
                      } else {
                        newMonth = selectedFilterMonth - 1;
                      }
                    } else {
                      if (selectedFilterMonth === 11) {
                        newMonth = 0;
                        newYear = selectedFilterYear + 1;
                      } else {
                        newMonth = selectedFilterMonth + 1;
                      }
                    }
                    setSelectedFilterMonth(newMonth);
                    setSelectedFilterYear(newYear);
                    setMonthlyYearlyFilterApplied(true);
                  };

                  return (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150 relative">
                      {/* Navigation Controls */}
                      <button
                        type="button"
                        onClick={() => navigateMonth('prev')}
                        className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 font-bold text-xs"
                      >
                        &lt;
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setMonthPickerOpen(!monthPickerOpen);
                          setYearPickerOpen(false);
                        }}
                        className="flex-1 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 text-[11px] font-bold"
                      >
                        {monthsFull[selectedFilterMonth]} {selectedFilterYear}
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => navigateMonth('next')}
                        className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 font-bold text-xs"
                      >
                        &gt;
                      </button>

                      {/* Apply Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyYearlyFilterApplied(true);
                          toast.success(`Filter applied for ${monthsShort[selectedFilterMonth]} ${selectedFilterYear}`);
                          setMonthPickerOpen(false);
                        }}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer shadow-sm text-white ${
                          monthlyYearlyFilterApplied 
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/15' 
                            : 'bg-emerald-600/40 hover:bg-emerald-500 text-emerald-100'
                        }`}
                        title="Apply Month Filter"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setMonthlyYearlyFilterApplied(false);
                          setSelectedFilterMonth(new Date().getMonth());
                          setSelectedFilterYear(new Date().getFullYear());
                          toast.success("Month filter cleared");
                          setMonthPickerOpen(false);
                        }}
                        className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer border border-slate-700/40"
                        title="Clear Month Filter"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Month Picker Dropdown Grid */}
                      {monthPickerOpen && (
                        <>
                          <div className="fixed inset-0 z-20 cursor-default" onClick={() => setMonthPickerOpen(false)} />
                          <div className="absolute top-9 left-0 right-0 bg-[#1a1d24] border border-slate-800 text-slate-200 rounded-xl shadow-2xl p-3 z-30 animate-in zoom-in-95 duration-150">
                            {/* Triangle Caret Pointer */}
                            <div className="absolute -top-1.5 left-[116px] w-3 h-3 bg-[#1a1d24] rotate-45 border-t border-l border-slate-800"></div>
                            
                            {/* Header */}
                            <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800 text-xs font-bold text-slate-400 select-none px-1 relative z-10">
                              <button
                                type="button"
                                onClick={() => setSelectedFilterYear(prev => prev - 1)}
                                className="p-1 hover:text-slate-100 transition cursor-pointer text-sm font-bold"
                              >
                                &laquo;
                              </button>
                              <span className="text-slate-200 font-bold text-xs">{selectedFilterYear}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedFilterYear(prev => prev + 1)}
                                className="p-1 hover:text-slate-100 transition cursor-pointer text-sm font-bold"
                              >
                                &raquo;
                              </button>
                            </div>
                            
                            {/* Grid */}
                            <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold relative z-10">
                              {monthsShort.map((m, idx) => (
                                <button
                                  type="button"
                                  key={m}
                                  onClick={() => {
                                    setSelectedFilterMonth(idx);
                                    setMonthlyYearlyFilterApplied(true);
                                    setMonthPickerOpen(false);
                                  }}
                                  className={`py-2 rounded-lg transition-colors cursor-pointer text-center ${
                                    selectedFilterMonth === idx 
                                      ? 'bg-[#2b303c] text-white font-bold' 
                                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {filterTab === 'Yearly' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in duration-150 relative">
                    {/* Navigation Controls */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilterYear(prev => prev - 1);
                        setMonthlyYearlyFilterApplied(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 font-bold text-xs"
                    >
                      &lt;
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setYearPickerOpen(!yearPickerOpen);
                        setMonthPickerOpen(false);
                        setDecadeStartYear(Math.floor(selectedFilterYear / 10) * 10);
                      }}
                      className="flex-1 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 text-[11px] font-bold"
                    >
                      {selectedFilterYear}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilterYear(prev => prev + 1);
                        setMonthlyYearlyFilterApplied(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/40 font-bold text-xs"
                    >
                      &gt;
                    </button>

                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlyYearlyFilterApplied(true);
                        toast.success(`Filter applied for Year ${selectedFilterYear}`);
                        setYearPickerOpen(false);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer shadow-sm text-white ${
                        monthlyYearlyFilterApplied 
                          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/15' 
                          : 'bg-emerald-600/40 hover:bg-emerald-500 text-emerald-100'
                      }`}
                      title="Apply Year Filter"
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMonthlyYearlyFilterApplied(false);
                        setSelectedFilterYear(new Date().getFullYear());
                        toast.success("Year filter cleared");
                        setYearPickerOpen(false);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer border border-slate-700/40"
                      title="Clear Year Filter"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Year Picker Dropdown Grid */}
                    {yearPickerOpen && (
                      <>
                        <div className="fixed inset-0 z-20 cursor-default" onClick={() => setYearPickerOpen(false)} />
                        <div className="absolute top-9 left-0 right-0 bg-[#1a1d24] border border-slate-800 text-slate-200 rounded-xl shadow-2xl p-3 z-30 animate-in zoom-in-95 duration-150">
                          {/* Triangle Caret Pointer */}
                          <div className="absolute -top-1.5 left-[116px] w-3 h-3 bg-[#1a1d24] rotate-45 border-t border-l border-slate-800"></div>
                          
                          {/* Header */}
                          <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-800 text-xs font-bold text-slate-400 select-none px-1 relative z-10">
                            <button
                              type="button"
                              onClick={() => setDecadeStartYear(prev => prev - 10)}
                              className="p-1 hover:text-slate-100 transition cursor-pointer text-sm font-bold"
                            >
                              &laquo;
                            </button>
                            <span className="text-slate-200 font-bold text-xs">{decadeStartYear} - {decadeStartYear + 9}</span>
                            <button
                              type="button"
                              onClick={() => setDecadeStartYear(prev => prev + 10)}
                              className="p-1 hover:text-slate-100 transition cursor-pointer text-sm font-bold"
                            >
                              &raquo;
                            </button>
                          </div>
                          
                          {/* Grid */}
                          <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-semibold relative z-10">
                            {Array.from({ length: 12 }, (_, i) => decadeStartYear - 1 + i).map(year => {
                              const isOut = year < decadeStartYear || year > (decadeStartYear + 9);
                              return (
                                <button
                                  type="button"
                                  key={year}
                                  onClick={() => {
                                    setSelectedFilterYear(year);
                                    setDecadeStartYear(Math.floor(year / 10) * 10);
                                    setMonthlyYearlyFilterApplied(true);
                                    setYearPickerOpen(false);
                                  }}
                                  className={`py-2 rounded-lg transition-colors cursor-pointer text-center ${
                                    selectedFilterYear === year 
                                      ? 'bg-[#2b303c] text-white font-bold' 
                                      : isOut
                                        ? 'text-slate-600 hover:bg-slate-800/40 hover:text-slate-500 font-medium'
                                        : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {year}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {filterTab === 'Custom' && (
                  <div className="flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-150">
                    <input 
                      type="date" 
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setCustomFilterApplied(false);
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-[#2a2f3a] border border-slate-700/40 rounded-lg focus:outline-none text-[10px] text-slate-200 font-semibold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      title="From Date"
                    />
                    <span className="text-[10px] text-slate-400 font-bold shrink-0">to</span>
                    <input 
                      type="date" 
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setCustomFilterApplied(false);
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-[#2a2f3a] border border-slate-700/40 rounded-lg focus:outline-none text-[10px] text-slate-200 font-semibold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      title="To Date"
                    />
                    
                    {/* Apply Button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (customStartDate || customEndDate) {
                          setCustomFilterApplied(true);
                          toast.success("Date range filter applied!");
                        } else {
                          toast.error("Select at least one date");
                        }
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all cursor-pointer shadow-sm text-white ${
                        customFilterApplied 
                          ? 'bg-emerald-500 hover:bg-emerald-600' 
                          : 'bg-emerald-600/40 hover:bg-emerald-500 text-emerald-100'
                      }`}
                      title="Apply Filter"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    
                    {/* Clear Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                        setCustomFilterApplied(false);
                        toast.success("Date range reset");
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-[#2a2f3a] hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer border border-slate-700/40"
                      title="Clear Filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {filterTab === 'Dynamic' && (
                  <select 
                    value={dynamicFilter}
                    onChange={(e) => setDynamicFilter(e.target.value)}
                    className="w-full text-xs bg-[#2d323f] border border-slate-700/40 p-2 rounded-lg focus:outline-none text-slate-200 font-semibold animate-in fade-in duration-150 cursor-pointer hover:bg-slate-700/80 transition-all"
                  >
                    <option value="This Month">This Month</option>
                    <option value="Last Month">Last Month</option>
                    <option value="Next Month">Next Month</option>
                    <option value="This Year">This Year</option>
                    <option value="Direct Chats">Direct Chats Only</option>
                    <option value="Unknown">Unknown Dates Only</option>
                  </select>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Group Chat List container */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {sortedProjects.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs font-semibold">No active inbox items</p>
            </div>
          ) : (
            sortedProjects.map((project) => {
              const jid = project.whatsapp_group_id;
              const isActive = activeProject?.whatsapp_group_id === jid;
              const unread = unreadCounts[jid] || 0;
              const lastMsg = lastMessages[jid] || "";

              return (
                <button
                  key={project.id}
                  onClick={() => setActiveProject(project)}
                  className={`w-full p-4 flex gap-3 text-left transition-all relative ${
                    isActive 
                      ? 'bg-slate-50/70 border-l-4 border-emerald-600' 
                      : 'hover:bg-slate-50/40 border-l-4 border-transparent'
                  }`}
                >
                  {/* Circle initial avatar / DP */}
                  {profilePics[jid] && profilePics[jid] !== 'no_pic' ? (
                    <img 
                      src={profilePics[jid]} 
                      alt={project.group_name} 
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0 text-sm">
                      {project.group_name.slice(0, 1).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex justify-between items-baseline gap-2">
                      <h4 className="font-semibold text-slate-900 text-xs truncate">{project.group_name}</h4>
                      <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                        {project.event_month !== 'Unknown' && project.event_month ? project.event_month : 'General'}
                      </span>
                    </div>

                    <p className="text-slate-500 text-[11px] truncate leading-tight flex items-center gap-1">
                      {typingStatus[jid] ? (
                        <span className="text-emerald-600 font-semibold animate-pulse">typing...</span>
                      ) : (
                        <>
                          {isActive ? <ArrowUpRight className="w-3 h-3 text-emerald-500 shrink-0" /> : <ArrowDownLeft className="w-3 h-3 text-slate-400 shrink-0" />}
                          {lastMsg || "Click to open conversation..."}
                        </>
                      )}
                    </p>

                    <div className="flex justify-between items-center pt-1 w-full">
                      {/* Channel Badge (whatsApp) */}
                      <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${project.whatsapp_group_id.endsWith('@g.us') ? 'bg-indigo-600' : 'bg-emerald-500'}`}>
                        {project.whatsapp_group_id.endsWith('@g.us') ? 'Group Chat' : 'Direct Chat'}
                      </span>
                      
                      {/* Status Badge */}
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>

                      {/* Unread badge */}
                      {unread > 0 && (
                        <span className="bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER PANE: Messenger history & input bar */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: "overlay", backgroundColor: "#efeae2", opacity: 0.99 }}>
        
        {activeProject ? (
          <>
            {/* Header info bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between z-10 shadow-sm shrink-0">
              <div className="flex items-center gap-3">
                {profilePics[activeProject.whatsapp_group_id] && profilePics[activeProject.whatsapp_group_id] !== 'no_pic' ? (
                  <img 
                    src={profilePics[activeProject.whatsapp_group_id]} 
                    alt={activeProject.group_name} 
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                    {activeProject.group_name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-800 text-xs tracking-tight">{activeProject.group_name}</h3>
                    {!activeProject.whatsapp_group_id.endsWith('@g.us') && onlineStatus[activeProject.whatsapp_group_id]?.isOnline && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold truncate max-w-[240px]">
                    {typingStatus[activeProject.whatsapp_group_id] ? (
                      <span className="text-emerald-600 font-bold animate-pulse">typing...</span>
                    ) : activeProject.whatsapp_group_id.endsWith('@g.us') ? (
                      groupMembers.length > 0 ? (
                        groupMembers.map(m => m.savedName || m.displayName || `+${m.phone}`).slice(0, 5).join(", ") + (groupMembers.length > 5 ? ` and ${groupMembers.length - 5} others` : "")
                      ) : (
                        "Loading group members..."
                      )
                    ) : (
                      onlineStatus[activeProject.whatsapp_group_id]?.isOnline ? (
                        <span className="text-emerald-600 font-semibold">online</span>
                      ) : (
                        `+${activeProject.whatsapp_group_id.split('@')[0]}`
                      )
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsChatSearching(!isChatSearching)}
                  className={`p-2 rounded-lg transition-all ${isChatSearching ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDrawerOpen(!drawerOpen)}
                  className={`p-2 rounded-lg transition-all ${drawerOpen ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-100 text-slate-400'}`}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Search Bar */}
            {isChatSearching && (
              <div className="bg-slate-50 border-b border-slate-200/60 px-6 py-2 flex items-center gap-3 z-10 shrink-0 animate-in slide-in-from-top duration-200">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input 
                  type="text" 
                  placeholder="Search in conversation..." 
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold"
                />
                <button 
                  onClick={() => {
                    setChatSearchQuery("");
                    setIsChatSearching(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Replying Quote Preview bar */}
            {replyingTo && (
              <div className="bg-[#f0f2f5] border-t border-slate-200 px-6 py-2 flex items-center justify-between z-10 shrink-0 animate-in slide-in-from-bottom duration-200">
                <div className="bg-white border-l-4 border-emerald-500 rounded p-1.5 flex-1 mr-4 text-[10px] text-slate-600 font-medium select-none">
                  <p className="font-bold text-emerald-700 text-[9px]">{replyingTo.senderName}</p>
                  <p className="truncate">{replyingTo.body}</p>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Bubble log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
              
              {/* Centered Date header */}
              <div className="flex justify-center my-2">
                <span className="bg-white/90 shadow-sm border border-slate-200/50 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full">
                  March 27, 2026
                </span>
              </div>

              {(() => {
                const filtered = messages.filter(msg => 
                  msg.body.toLowerCase().includes(chatSearchQuery.toLowerCase())
                );
                
                if (filtered.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-white/40 backdrop-blur-sm rounded-3xl m-4">
                      <MessageSquare className="w-10 h-10 text-slate-400 mb-2" />
                      <p className="font-bold text-slate-700 text-xs">
                        {chatSearchQuery ? "No matching messages found" : "No message history loaded"}
                      </p>
                    </div>
                  );
                }
                
                return filtered.map((msg, index) => {
                  const isMe = msg.fromMe;
                  return (
                    <div 
                      key={msg.id || index}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300 group`}
                    >
                      <div className={`max-w-[65%] rounded-xl px-3.5 py-2 shadow-sm relative border ${
                        isMe 
                          ? 'bg-[#d9fdd3] text-[#111b21] border-[#c0ebd0] rounded-tr-none' 
                          : 'bg-white text-[#111b21] border-slate-100 rounded-tl-none'
                      }`}>
                        
                        {/* Reply overlay arrow icon on hover */}
                        <button 
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className={`absolute ${isMe ? '-left-7' : '-right-7'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 bg-white shadow-sm border border-slate-100 rounded-full cursor-pointer transition-all hover:scale-105 z-10`}
                          title="Reply"
                        >
                          <ArrowDownLeft className="w-3.5 h-3.5 -scale-x-100" />
                        </button>

                        {/* Sender Name */}
                        {!isMe && (
                          <p className="text-[9px] font-black text-emerald-600 mb-1">
                            {msg.senderName}
                          </p>
                        )}

                        {/* Render Quoted/Replying Message Box */}
                        {msg.quotedBody && (
                          <div className="bg-black/5 border-l-4 border-emerald-500 rounded p-1.5 mb-1.5 text-[10px] text-slate-600 font-medium select-none">
                            <p className="font-bold text-emerald-700 text-[9px]">{msg.quotedSender}</p>
                            <p className="truncate max-w-[200px]">{msg.quotedBody}</p>
                          </div>
                        )}

                        {/* Body */}
                        {msg.hasMedia ? (
                          <div className="my-1 max-w-[240px]">
                            {mediaData[msg.id] ? (
                              mediaData[msg.id].error ? (
                                <p className="text-[10px] text-red-500 font-semibold italic">{mediaData[msg.id].error}</p>
                              ) : mediaData[msg.id].mimetype.startsWith('image/') ? (
                                <img 
                                  src={`data:${mediaData[msg.id].mimetype};base64,${mediaData[msg.id].data}`} 
                                  alt={mediaData[msg.id].filename || "image"} 
                                  className="rounded-lg shadow-sm border border-slate-200/50 max-h-48 object-cover cursor-zoom-in"
                                  onClick={() => {
                                    const win = window.open();
                                    win?.document.write(`<img src="data:${mediaData[msg.id].mimetype};base64,${mediaData[msg.id].data}" style="max-width:100%;height:auto;display:block;margin:auto;" />`);
                                  }}
                                />
                              ) : (
                                <div className="bg-slate-100 p-2.5 rounded-lg border border-slate-200/55 flex items-center gap-3 max-w-[220px]">
                                  <div className="bg-slate-200 p-2 rounded-lg text-slate-600 shrink-0">
                                    <Download className="w-4 h-4" />
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-[10px] font-bold text-slate-700 truncate">{mediaData[msg.id].filename || "Document"}</p>
                                    <button 
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `data:${mediaData[msg.id].mimetype};base64,${mediaData[msg.id].data}`;
                                        link.download = mediaData[msg.id].filename || "Download";
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                      }}
                                      className="text-[9px] text-blue-600 font-black hover:underline cursor-pointer"
                                    >
                                      Download ({mediaData[msg.id].mimetype.split('/').pop()?.toUpperCase()})
                                    </button>
                                  </div>
                                </div>
                              )
                            ) : (
                              <button 
                                onClick={() => {
                                  setMediaData(prev => ({ ...prev, [msg.id]: { mimetype: "", data: "", loading: true } }));
                                  socket?.emit('get_chat_media', { messageId: msg.id });
                                }}
                                className="bg-white/95 border border-slate-200/55 p-3 rounded-xl flex items-center gap-3 text-left shadow-sm hover:bg-slate-50 transition-colors cursor-pointer w-full"
                              >
                                {mediaData[msg.id]?.loading ? (
                                  <Loader2 className="w-6 h-6 animate-spin text-emerald-500 shrink-0" />
                                ) : (
                                  <Download className="w-6 h-6 text-emerald-600 shrink-0" />
                                )}
                                <div>
                                  <p className="text-[10px] font-black text-slate-800">Media File</p>
                                  <p className="text-[9px] text-slate-400 font-bold">{mediaData[msg.id]?.loading ? 'Downloading...' : 'Click to Download / View'}</p>
                                </div>
                              </button>
                            )}
                            {msg.body && msg.body !== msg.id && (
                              <p className="text-xs font-medium whitespace-pre-wrap break-words leading-normal text-slate-800 mt-1.5">{msg.body}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-medium whitespace-pre-wrap break-words leading-normal text-slate-800">{msg.body}</p>
                        )}
                        
                        {/* Timestamp & Pin Action */}
                        <div className="flex items-center justify-between mt-1.5 gap-4">
                          <button
                            onClick={() => handlePinChatMessage(msg.body)}
                            className={`opacity-0 group-hover:opacity-100 text-[9px] font-bold flex items-center gap-0.5 cursor-pointer transition-opacity ${isMe ? 'text-emerald-700 hover:text-emerald-950' : 'text-emerald-600 hover:text-emerald-800'}`}
                            title="Pin guideline"
                          >
                            <Pin className="w-2.5 h-2.5 rotate-45" /> Pin
                          </button>
                          
                          <div className="flex items-center gap-1">
                            <p className="text-[8px] font-semibold text-slate-400 font-medium">
                              {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {isMe && (() => {
                              const ack = msg.ack || 1;
                              if (ack === 1) {
                                return <Check className="w-3 h-3 text-slate-400 shrink-0" />;
                              }
                              if (ack === 2) {
                                return (
                                  <div className="flex -space-x-1 shrink-0">
                                    <Check className="w-3 h-3 text-slate-400" />
                                    <Check className="w-3 h-3 text-slate-400" />
                                  </div>
                                );
                              }
                              if (ack >= 3) {
                                return (
                                  <div className="flex -space-x-1 shrink-0">
                                    <Check className="w-3 h-3 text-sky-500 font-bold" />
                                    <Check className="w-3 h-3 text-sky-500 font-bold" />
                                  </div>
                                );
                              }
                              return <Check className="w-3 h-3 text-slate-400 shrink-0" />;
                            })()}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={messagesEndRef} />
            </div>

            {/* Input send bar */}
            <form 
              onSubmit={handleSendMessage}
              className="bg-[#f0f2f5] border-t border-slate-200 px-4 py-3 flex items-center gap-3 z-10 shrink-0"
            >
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input 
                type="text" 
                placeholder="Type a message..." 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 bg-white border border-transparent px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs font-medium transition-colors shadow-sm"
              />
              <div className="relative shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setEmojiPickerOpen(!emojiPickerOpen);
                    setCannedRepliesOpen(false);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerOpen && (
                  <div className="absolute bottom-12 right-0 bg-white border border-slate-200/80 p-2.5 rounded-2xl shadow-xl z-20 grid grid-cols-6 gap-1.5 w-48 animate-in zoom-in-95 duration-150 select-none">
                    {["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","❤️","👍","🔥","👏"].map(emoji => (
                      <button 
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setInputText(prev => prev + emoji);
                          setEmojiPickerOpen(false);
                        }}
                        className="text-lg hover:bg-slate-100 p-0.5 rounded transition cursor-pointer flex items-center justify-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setCannedRepliesOpen(!cannedRepliesOpen);
                    setEmojiPickerOpen(false);
                  }}
                  className="p-2 text-slate-500 hover:text-slate-700 cursor-pointer"
                  title="Quick templates"
                >
                  <FolderHeart className="w-4 h-4" />
                </button>
                {cannedRepliesOpen && (
                  <div className="absolute bottom-12 right-0 bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xl z-20 w-64 animate-in zoom-in-95 duration-150 select-none space-y-2 max-h-60 overflow-y-auto">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Quick Templates</h5>
                    <div className="flex flex-col gap-1">
                      {cannedReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setInputText(prev => prev + (prev ? " " : "") + reply.text);
                            setCannedRepliesOpen(false);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 text-[10px] text-slate-700 font-semibold border border-transparent hover:border-slate-100 transition truncate flex flex-col gap-0.5"
                        >
                          <span className="font-bold text-slate-800 text-xs">{reply.label}</span>
                          <span className="text-slate-400 truncate w-full">{reply.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative shrink-0">
                <button 
                  type="button" 
                  onClick={() => {
                    setAiPopoverOpen(!aiPopoverOpen);
                    setCannedRepliesOpen(false);
                    setEmojiPickerOpen(false);
                  }}
                  className="p-2 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                  title="AI Message Enhancer"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-indigo-500 hover:scale-105 transition-transform" />
                  )}
                </button>
                {aiPopoverOpen && (
                  <div className="absolute bottom-12 right-0 bg-white border border-slate-200/80 p-3 rounded-2xl shadow-xl z-20 w-56 animate-in zoom-in-95 duration-150 select-none space-y-2">
                    <div className="flex items-center gap-1.5 px-1 pb-1 border-b border-slate-100">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">AI Tone Rewriter</h5>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => handleAiEnhance('professional')}
                        className="w-full text-left px-2 py-1 transition rounded-lg hover:bg-slate-50 text-[10px] text-slate-700 font-bold flex flex-col"
                      >
                        <span>✨ Professional</span>
                        <span className="text-slate-400 font-normal text-[8px] mt-0.5">Formal business formatting</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhance('polite')}
                        className="w-full text-left px-2 py-1 transition rounded-lg hover:bg-slate-50 text-[10px] text-slate-700 font-bold flex flex-col"
                      >
                        <span>🤝 Friendly & Polite</span>
                        <span className="text-slate-400 font-normal text-[8px] mt-0.5">Adds warmth & emojis</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhance('crisp')}
                        className="w-full text-left px-2 py-1 transition rounded-lg hover:bg-slate-50 text-[10px] text-slate-700 font-bold flex flex-col"
                      >
                        <span>⚡ Short & Crisp</span>
                        <span className="text-slate-400 font-normal text-[8px] mt-0.5">Shortens to the point</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAiEnhance('schedule')}
                        className="w-full text-left px-2 py-1 transition rounded-lg hover:bg-slate-50 text-[10px] text-slate-700 font-bold flex flex-col"
                      >
                        <span>📅 Booking Follow-up</span>
                        <span className="text-slate-400 font-normal text-[8px] mt-0.5">Drafts schedule checklist</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                type="submit"
                disabled={!inputText.trim()}
                className="bg-[#00a884] hover:bg-[#008f70] disabled:bg-slate-200 text-white p-2.5 rounded-xl shadow-md disabled:shadow-none hover:-translate-y-0.5 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <div className="bg-white/80 border border-slate-200 p-10 rounded-2xl shadow-xl max-w-sm animate-in zoom-in duration-300">
              <MessageSquare className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
              <h3 className="text-md font-bold text-slate-800 mb-1">WhatsACP Live Chat</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Select a group project from the sidebar to view chat logs, resolve contacts, assign crew, and schedule shoot dates.</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANE: Collapsible Accordion Side-bar (Chat Info) */}
      {activeProject && drawerOpen && (
        <div className="w-[300px] border-l border-slate-200 bg-white flex flex-col shrink-0 z-10 animate-in slide-in-from-right duration-300">
          
          {/* Title Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <span className="font-bold text-slate-700 text-xs">Chat Info</span>
            <div className="flex items-center gap-1.5 animate-in fade-in duration-100">
              <button 
                type="button"
                onClick={handleExportTranscript}
                disabled={messages.length === 0}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Export Chat History (.txt)"
              >
                <FileDown className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Details Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center shrink-0">
            {profilePics[activeProject.whatsapp_group_id] && profilePics[activeProject.whatsapp_group_id] !== 'no_pic' ? (
              <img 
                src={profilePics[activeProject.whatsapp_group_id]} 
                alt={activeProject.group_name} 
                className="w-14 h-14 rounded-full object-cover shrink-0 shadow-sm mb-3"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xl shadow-sm mb-3">
                {activeProject.group_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <h4 className="font-bold text-slate-800 text-xs max-w-[200px] truncate">{activeProject.group_name}</h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{activeProject.whatsapp_group_id}</p>
          </div>

          {/* Accordion Panels Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            
            {/* ACCORDION 1: CONTACT INFO */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('contact')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>CONTACT INFO</span>
                {accordionOpen.contact ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.contact && (
                <div className="px-4 pb-4 space-y-2 text-[11px] text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Name</span>
                    <span className="font-semibold text-slate-800 truncate max-w-[150px]">{activeProject.group_name}</span>
                  </div>
                  {!activeProject.whatsapp_group_id.endsWith('@g.us') && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mobile Number</span>
                      <span className="font-semibold text-slate-800 truncate max-w-[150px]">+{activeProject.whatsapp_group_id.split('@')[0]}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Type</span>
                    <span className="font-semibold text-slate-800">
                      {activeProject.whatsapp_group_id.endsWith('@g.us') ? 'Group Chat' : 'Direct Chat'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 2: STAGE LABELS */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('labels')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>STAGE LABELS</span>
                {accordionOpen.labels ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.labels && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getStatusColor(projectStatus)}`}>
                      {projectStatus}
                    </span>
                    {projectMonth && (
                      <span className="text-[10px] font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-md">
                        {projectMonth}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <select 
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg focus:outline-none text-slate-700 font-semibold"
                    >
                      <option value="Unassigned">Unassigned</option>
                      <option value="Pre-Prod">Pre-Prod</option>
                      <option value="Production">Production</option>
                      <option value="Editing">Editing</option>
                      <option value="Revisions">Revisions</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <input 
                      type="date" 
                      value={eventDateVal}
                      onChange={handleDateChange}
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-[11px] text-slate-700 font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: ASSIGNED AGENTS (CREW) */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('crew')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>ASSIGNED CREW ({crewList.length})</span>
                {accordionOpen.crew ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.crew && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                    <input 
                      type="text" 
                      placeholder="Name"
                      value={crewNameInput}
                      onChange={(e) => setCrewNameInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none"
                    />
                    <input 
                      type="text" 
                      placeholder="Role (e.g. Cinemafilm)"
                      value={crewRoleInput}
                      onChange={(e) => setCrewRoleInput(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Phone"
                        value={crewPhoneInput}
                        onChange={(e) => setCrewPhoneInput(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none"
                      />
                      <button 
                        type="button"
                        onClick={handleAddCrewMember}
                        className="bg-indigo-600 text-white px-2 py-1 rounded-md text-[10px] font-bold hover:bg-indigo-700 transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {crewList.map((item) => (
                      <div key={item.id} className="bg-white p-2.5 rounded-xl border border-slate-100 flex items-start justify-between shadow-sm">
                        <div className="text-[11px] space-y-0.5 font-medium">
                          <p className="text-slate-800 font-bold">{item.name} - <span className="text-indigo-600">{item.role}</span></p>
                          <p className="text-slate-400">📞 {item.phone}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteCrewMember(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 4: NOTES / COORDINATES */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('notes')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>NOTES & COORDINATES ({pinnedList.length})</span>
                {accordionOpen.notes ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.notes && (
                <div className="px-4 pb-4 space-y-3">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add private note..."
                      value={customNoteInput}
                      onChange={(e) => setCustomNoteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (customNoteInput.trim() && activeProject && socket && connected) {
                            socket.emit("add_pinned_note", { chatId: activeProject.whatsapp_group_id, content: customNoteInput.trim() });
                            setCustomNoteInput("");
                            toast.success("Note added!");
                          } else if (!connected) {
                            toast.error("Offline fallback: Cannot add custom note");
                          }
                        }
                      }}
                      className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:outline-none font-medium text-slate-700"
                    />
                    <button 
                      type="button"
                      disabled={!customNoteInput.trim()}
                      onClick={() => {
                        if (customNoteInput.trim() && activeProject && socket && connected) {
                          socket.emit("add_pinned_note", { chatId: activeProject.whatsapp_group_id, content: customNoteInput.trim() });
                          setCustomNoteInput("");
                          toast.success("Note added!");
                        }
                      }}
                      className="bg-emerald-600 disabled:opacity-50 text-white px-2 py-1 rounded-md text-[10px] font-bold hover:bg-emerald-700 transition shrink-0 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>

                  <div className="space-y-2">
                    {pinnedList.map((item) => (
                      <div key={item.id} className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl flex items-start justify-between shadow-sm">
                        <div className="text-[11px] space-y-0.5 text-slate-700 font-medium leading-relaxed">
                          <p className="whitespace-pre-wrap break-words">{item.text}</p>
                          <p className="text-[8px] text-slate-400 font-semibold">{item.timestamp}</p>
                        </div>
                        <button 
                          onClick={() => handleDeletePinnedMessage(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors shrink-0 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 5: GROUP MEMBERS */}
            {activeProject.whatsapp_group_id.endsWith('@g.us') && (
              <div className="bg-white">
                <button 
                  onClick={() => toggleAccordion('exporter')}
                  className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
                >
                  <span>GROUP MEMBERS ({groupMembers.length})</span>
                  {accordionOpen.exporter ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                {accordionOpen.exporter && (
                  <div className="px-4 pb-4 space-y-3.5">
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyNumbers}
                        disabled={groupMembers.length === 0}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <Clipboard className="w-3.5 h-3.5" /> {copiedNumbers ? "Copied" : "Copy Numbers"}
                      </button>
                      <button
                        onClick={handleExportCSV}
                        disabled={groupMembers.length === 0}
                        className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 cursor-pointer flex items-center justify-center gap-0.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    </div>

                    <div className="max-h-[220px] overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100 bg-slate-50/50">
                      {groupMembers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs font-semibold">Loading group members...</div>
                      ) : (
                        groupMembers.map((p, idx) => (
                          <div key={p.phone || idx} className="p-2 flex items-center justify-between text-[10px]">
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-slate-800 truncate">
                                {p.savedName || p.displayName || `+${p.phone}`}
                              </span>
                              {(p.savedName || p.displayName) && (
                                <span className="text-slate-400 text-[8px] font-semibold">+{p.phone}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {p.isAdmin && <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 rounded font-bold">Admin</span>}
                              <button 
                                type="button"
                                onClick={() => startDirectChat(p)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-md transition shadow-sm cursor-pointer"
                                title="Send private message"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACCORDION 5.5: SHARED FILES */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('shared')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>SHARED FILES ({messages.filter(m => m.hasMedia).length})</span>
                {accordionOpen.shared ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.shared && (
                <div className="px-4 pb-4 space-y-2">
                  {messages.filter(m => m.hasMedia).length === 0 ? (
                    <div className="text-center p-4 text-slate-400 text-[10px] font-semibold">No shared files found</div>
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg bg-slate-50/50">
                      {messages.filter(m => m.hasMedia).map((msg, idx) => {
                        const fileMeta = mediaData[msg.id];
                        const displayName = fileMeta?.filename || msg.body || `File_${idx + 1}`;
                        const isImage = fileMeta?.mimetype?.startsWith('image/');

                        return (
                          <div key={msg.id || idx} className="p-2 flex items-center justify-between gap-2 text-[10px] font-medium">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {fileMeta ? (
                                isImage ? (
                                  <img 
                                    src={`data:${fileMeta.mimetype};base64,${fileMeta.data}`} 
                                    alt="thumbnail" 
                                    className="w-7 h-7 rounded object-cover shrink-0 border border-slate-200"
                                  />
                                ) : (
                                  <FileText className="w-6 h-6 text-slate-500 shrink-0" />
                                )
                              ) : (
                                <FileText className="w-6 h-6 text-slate-400 shrink-0" />
                              )}
                              <span className="text-slate-700 truncate block flex-1" title={displayName}>
                                {displayName}
                              </span>
                            </div>
                            {fileMeta ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = `data:${fileMeta.mimetype};base64,${fileMeta.data}`;
                                  link.download = fileMeta.filename || "Download";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="text-emerald-600 hover:text-emerald-700 p-1 bg-white hover:bg-slate-100 border border-slate-100 rounded shadow-sm transition cursor-pointer"
                                title="Download"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setMediaData(prev => ({ ...prev, [msg.id]: { mimetype: "", data: "", loading: true } }));
                                  socket?.emit('get_chat_media', { messageId: msg.id });
                                  toast.loading("Downloading shared file...");
                                }}
                                className="text-indigo-600 hover:text-indigo-700 p-1 bg-white hover:bg-slate-100 border border-slate-100 rounded shadow-sm transition cursor-pointer"
                                title="Load Media"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ACCORDION 6: CHAT ACTIVITY */}
            <div className="bg-white">
              <button 
                onClick={() => toggleAccordion('activity')}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-700 hover:bg-slate-50 font-bold text-xs"
              >
                <span>ACTIVITY</span>
                {accordionOpen.activity ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              {accordionOpen.activity && (
                <div className="px-4 pb-4 space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <div className="flex justify-between">
                    <span>Total Messages</span>
                    <span className="font-bold text-slate-700">{messages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Media Files</span>
                    <span className="font-bold text-slate-700">{messages.filter(m => m.hasMedia).length}</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Action Bar */}
          <div className="p-4 border-t border-slate-100 shrink-0 bg-white">
            <button 
              onClick={handleSaveBriefDetails}
              className="w-full bg-gradient-to-r from-[#3b9f78] to-[#128c7e] hover:from-[#328665] hover:to-[#0f776a] text-white py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Save Details
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
