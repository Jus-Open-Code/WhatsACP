"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, Search, Plus, Filter, LayoutList, Download, Printer, Settings, MoreHorizontal, Edit2, X, ChevronDown, ChevronLeft, ChevronRight, User, Trash2, Pin, RefreshCw } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';
import { io } from 'socket.io-client';

interface Project {
  id: number | string;
  whatsapp_group_id: string;
  group_name: string;
  status: string;
  event_month: string;
}

interface CrewItem {
  id: string;
  name: string;
  role: string;
  phone: string;
}

interface PinnedNote {
  id: string;
  text: string;
  timestamp: string;
}

function parseEventMonthToDate(eventMonth: string): string {
  if (!eventMonth || eventMonth === 'Unknown') return '';
  const parts = eventMonth.split(' ');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthStr = parts[1].toLowerCase();
    const year = parts[2];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.indexOf(monthStr);
    if (monthIndex !== -1) {
      const month = (monthIndex + 1).toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }
  return '';
}

export default function KanbanBoard({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [isBrowser, setIsBrowser] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Detect if Supabase credentials are placeholders (offline/fallback mode)
  const isOffline = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder-project.supabase.co';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (isOffline) {
        // Offline mode: just reset to initial mock data
        setProjects(initialProjects);
        toast.success('Refreshed from local cache.');
      } else {
        const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
        if (!error && data) {
          setProjects(data);
          toast.success('Group manager refreshed!');
        } else {
          setProjects(initialProjects);
          toast.success('Refreshed from local cache.');
        }
      }
    } catch {
      setProjects(initialProjects);
      toast.success('Refreshed from local cache.');
    } finally {
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // Download project brief as .txt report
  const downloadProjectBrief = (project: Project) => {
    let crewList: CrewItem[] = [];
    let pinsList: PinnedNote[] = [];
    if (typeof window !== 'undefined') {
      const savedCrew = localStorage.getItem(`brief_crew_${project.whatsapp_group_id}`);
      if (savedCrew) crewList = JSON.parse(savedCrew);
      const savedPins = localStorage.getItem(`brief_pins_${project.whatsapp_group_id}`);
      if (savedPins) pinsList = JSON.parse(savedPins);
    }
    
    let content = `# 📄 WhatsACP CRM — Project Brief Report\n\n`;
    content += `==========================================\n`;
    content += `Project/Group Name: ${project.group_name}\n`;
    content += `Status:             ${project.status || 'Unassigned'}\n`;
    content += `Event Month:        ${project.event_month || 'N/A'}\n`;
    content += `WhatsApp Group ID:  ${project.whatsapp_group_id}\n`;
    content += `==========================================\n\n`;
    
    content += `## 👥 CREW ASSIGNMENTS\n`;
    if (crewList.length === 0) {
      content += `No crew assigned yet.\n`;
    } else {
      crewList.forEach((member, i) => {
        content += `${i + 1}. [${member.role.toUpperCase()}] ${member.name} — Phone: ${member.phone}\n`;
      });
    }
    
    content += `\n## 📌 PINNED BRIEF NOTES & GUIDELINES\n`;
    if (pinsList.length === 0) {
      content += `No pinned guidelines notes.\n`;
    } else {
      pinsList.forEach((pin, i) => {
        content += `${i + 1}. [${pin.timestamp || 'Pinned'}] ${pin.text}\n`;
      });
    }
    
    content += `\n---\nReport generated on ${new Date().toLocaleString()}\n`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeName = project.group_name.replace(/[^\w\s-]/g, '').trim() || "project";
    link.href = url;
    link.download = `Project_Brief_${safeName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Brief report downloaded for ${project.group_name}!`);
  };

  // Details Drawer State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [crew, setCrew] = useState<CrewItem[]>([]);
  const [pins, setPins] = useState<PinnedNote[]>([]);
  
  // Crew inputs
  const [crewName, setCrewName] = useState('');
  const [crewRole, setCrewRole] = useState('');
  const [crewPhone, setCrewPhone] = useState('');
  
  // Pin inputs
  const [pinText, setPinText] = useState('');

  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    setIsBrowser(true);
    
    if (isOffline) {
      let savedUrl = typeof window !== 'undefined' ? localStorage.getItem('whatsacp_backend_url') : null;
      if (savedUrl && savedUrl.includes("vercel.app")) {
        localStorage.removeItem('whatsacp_backend_url');
        savedUrl = null;
      }
      const socketUrl = savedUrl || "http://localhost:3001";
      const myClientId = typeof window !== 'undefined' ? (localStorage.getItem('whatsacp_client_id') || 'default') : 'default';
      const socketClient = io(socketUrl, { 
        query: { clientId: myClientId },
        transports: ['websocket', 'polling'] 
      });
      setSocket(socketClient);

      socketClient.on('connect', () => {
        socketClient.emit('get_projects');
      });

      socketClient.on('projects_response', (data: { projects: Project[]; error?: string }) => {
        if (!data.error && data.projects && data.projects.length > 0) {
          const mapped = data.projects.map(p => ({
            ...p,
            id: p.whatsapp_group_id // Ensure ID is a string (whatsapp_group_id) for dnd
          }));
          setProjects(mapped);
        }
      });

      socketClient.on('groups_synced', () => {
        socketClient.emit('get_projects');
      });

      return () => {
        socketClient.disconnect();
      };
    }
  }, [isOffline]);

  // Sync crew and pins from localStorage when selected project changes
  useEffect(() => {
    if (selectedProject) {
      const savedCrew = localStorage.getItem(`brief_crew_${selectedProject.whatsapp_group_id}`);
      setCrew(savedCrew ? JSON.parse(savedCrew) : []);
      
      const savedPins = localStorage.getItem(`brief_pins_${selectedProject.whatsapp_group_id}`);
      setPins(savedPins ? JSON.parse(savedPins) : []);
    } else {
      setCrew([]);
      setPins([]);
    }
  }, [selectedProject]);

  const columns = [
    { id: 'Unassigned', color: 'border-yellow-400' },
    { id: 'Pre-Prod', color: 'border-blue-400' },
    { id: 'Editing', color: 'border-indigo-400' },
    { id: 'Revisions', color: 'border-purple-400' },
    { id: 'Completed', color: 'border-emerald-400' }
  ];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId !== destination.droppableId) {
      const updatedProjects = projects.map(p => {
        if (p.id.toString() === draggableId) {
          return { ...p, status: destination.droppableId };
        }
        return p;
      });
      setProjects(updatedProjects);
      toast.success(`Moved to ${destination.droppableId}!`);

      // Only sync to Supabase if credentials are real
      if (!isOffline) {
        const { error } = await supabase
          .from('projects')
          .update({ status: destination.droppableId })
          .eq('id', parseInt(draggableId, 10));

        if (error) {
          console.warn("Supabase sync skipped (offline mode):", error);
        }
      } else if (socket) {
        const targetProj = projects.find(p => p.id.toString() === draggableId);
        if (targetProj) {
          socket.emit('update_project', {
            jid: targetProj.whatsapp_group_id,
            status: destination.droppableId,
            event_month: targetProj.event_month || 'Unknown'
          });
        }
      }
    }
  };

  const handleAddCrew = () => {
    if (!crewName.trim() || !crewRole.trim() || !selectedProject) return;
    const newItem: CrewItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: crewName.trim(),
      role: crewRole.trim(),
      phone: crewPhone.trim() || 'No Phone'
    };
    const updated = [...crew, newItem];
    setCrew(updated);
    localStorage.setItem(`brief_crew_${selectedProject.whatsapp_group_id}`, JSON.stringify(updated));
    setCrewName('');
    setCrewRole('');
    setCrewPhone('');
    toast.success("Crew member added!");
  };

  const handleDeleteCrew = (id: string) => {
    if (!selectedProject) return;
    const updated = crew.filter(item => item.id !== id);
    setCrew(updated);
    localStorage.setItem(`brief_crew_${selectedProject.whatsapp_group_id}`, JSON.stringify(updated));
    toast.success("Crew member removed!");
  };

  const handleAddPin = () => {
    if (!pinText.trim() || !selectedProject) return;
    const newItem: PinnedNote = {
      id: Math.random().toString(36).substring(2, 9),
      text: pinText.trim(),
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [...pins, newItem];
    setPins(updated);
    localStorage.setItem(`brief_pins_${selectedProject.whatsapp_group_id}`, JSON.stringify(updated));
    setPinText('');
    toast.success("Note pinned!");
  };

  const handleDeletePin = (id: string) => {
    if (!selectedProject) return;
    const updated = pins.filter(item => item.id !== id);
    setPins(updated);
    localStorage.setItem(`brief_pins_${selectedProject.whatsapp_group_id}`, JSON.stringify(updated));
    toast.success("Note unpinned!");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedProject) return;
    
    const updated = projects.map(p => p.id === selectedProject.id ? { ...p, status: newStatus } : p);
    setProjects(updated);
    setSelectedProject({ ...selectedProject, status: newStatus });
    
    const { error } = await supabase
      .from('projects')
      .update({ status: newStatus })
      .eq('id', selectedProject.id);
      
    if (error) {
      console.error(error);
      toast.error("Failed to save stage changes.");
    } else {
      toast.success(`Stage updated to ${newStatus}`);
    }
  };

  const handleDateChange = async (newDate: string) => {
    if (!selectedProject) return;
    
    let monthYear = 'Unknown';
    if (newDate) {
      const dateObj = new Date(newDate);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear().toString();
      monthYear = `${dateObj.getDate()} ${month.substring(0, 3)} ${year}`;
    }
    
    const updated = projects.map(p => p.id === selectedProject.id ? { ...p, event_month: monthYear } : p);
    setProjects(updated);
    setSelectedProject({ ...selectedProject, event_month: monthYear });
    
    const { error } = await supabase
      .from('projects')
      .update({ event_month: monthYear })
      .eq('id', selectedProject.id);
      
    if (error) {
      console.error(error);
      toast.error("Failed to save date changes.");
    } else {
      toast.success(`Event date updated to ${monthYear}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen text-slate-700 dark:text-slate-200 font-sans transition-colors duration-200">
      <Toaster position="top-center" />
      
      {/* Top Header - Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6 mt-1">
            <button 
              onClick={() => setView('list')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors -mb-[17px] ${view === 'list' ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              List
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors -mb-[17px] ${view === 'kanban' ? 'border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-100' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              Kanban
            </button>
          </div>
        </div>

        {/* Right side: Group Manager Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh Group Manager"
          aria-label="Refresh Group Manager"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-60 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Second Header - Filters & Search */}
      <div className="flex flex-wrap items-center justify-end px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-950/20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Tasks..." 
              className="pl-3 pr-8 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded text-sm w-64 focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-2.5 top-2" />
          </div>
        </div>
      </div>

      {/* VIEW RENDERER */}
      <div className="p-6">
        
        {/* LIST VIEW */}
        {view === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm">Title</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm">Start date</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm">Crew</th>
                  <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-sm">Status</th>
                  <th className="py-3 px-2 text-right"><MoreHorizontal className="w-4 h-4 inline-block text-slate-500" /></th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">No tasks found</td>
                  </tr>
                ) : (
                  projects.map((project, index) => (
                    <tr key={project.id} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950/45 group transition-colors">
                      <td 
                        onClick={() => setSelectedProject(project)}
                        className="py-3 px-4 text-sm font-medium text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                      >
                        {project.group_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{project.event_month || '-'}</td>
                      <td className="py-3 px-4">
                        {(() => {
                          let crewList: CrewItem[] = [];
                          if (typeof window !== 'undefined') {
                            const saved = localStorage.getItem(`brief_crew_${project.whatsapp_group_id}`);
                            if (saved) crewList = JSON.parse(saved);
                          }
                          
                          if (crewList.length === 0) {
                            return (
                              <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs select-none">
                                <span className="w-5 h-5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-black">+</span>
                                <span className="font-semibold text-[10px]">No crew</span>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="flex -space-x-1.5 overflow-hidden">
                              {crewList.slice(0, 3).map((member, idx) => (
                                <div 
                                  key={member.id || idx} 
                                  className="w-6 h-6 rounded-full border border-white dark:border-slate-900 bg-gradient-to-tr from-indigo-500 to-indigo-400 text-white flex items-center justify-center text-[9px] font-black uppercase shadow-sm select-none"
                                  title={`${member.name} (${member.role})`}
                                >
                                  {member.name.slice(0, 2)}
                                </div>
                              ))}
                              {crewList.length > 3 && (
                                <div className="w-6 h-6 rounded-full border border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[8px] font-bold shadow-sm select-none">
                                  +{crewList.length - 3}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-indigo-650 dark:bg-indigo-700/80 text-white text-xs px-2.5 py-1 rounded">
                          {project.status || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadProjectBrief(project);
                            }}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 cursor-pointer"
                            title="Download Project Brief"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setSelectedProject(project)}
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 cursor-pointer"
                            title="Edit details"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            className="p-1.5 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-450 dark:text-slate-500 cursor-pointer"
                            title="Delete"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <div className="border border-slate-200 dark:border-slate-800 rounded px-2 py-1 flex items-center gap-2 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">
                  10 <ChevronDown className="w-4 h-4" />
                </div>
                <span>1-{projects.length} / {projects.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:text-slate-800 dark:hover:text-white cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
                <button className="px-3 py-1 border border-indigo-500 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded bg-white dark:bg-slate-950">1</button>
                <button className="p-1 hover:text-slate-800 dark:hover:text-white cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && isBrowser && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4 items-start">
              {columns.map((col) => {
                const colProjects = projects.filter(p => (p.status || 'Unassigned') === col.id);
                
                return (
                  <div key={col.id} className="flex-shrink-0 w-72 flex flex-col">
                    {/* Column Header (White background, Top colored border) */}
                    <div className={`bg-white dark:bg-slate-900 rounded border-t-2 border-b border-l border-r border-slate-100 dark:border-slate-800/80 ${col.color} p-3 mb-2 flex justify-between items-center shadow-sm`}>
                      <h2 className="text-sm text-slate-600 dark:text-slate-300 font-medium">{col.id}</h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{colProjects.length}</span>
                    </div>
                    
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`flex flex-col gap-2 min-h-[100px] transition-colors rounded ${snapshot.isDraggingOver ? 'bg-slate-50/50 dark:bg-slate-950/20' : ''}`}
                        >
                          {colProjects.map((project, index) => (
                            <Draggable key={project.id} draggableId={project.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{ ...provided.draggableProps.style }}
                                  onClick={() => !snapshot.isDragging && setSelectedProject(project)}
                                  className={`bg-white dark:bg-slate-900 p-4 rounded shadow-sm border cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${snapshot.isDragging ? 'border-indigo-400 dark:border-indigo-500 shadow-md' : 'border-slate-100 dark:border-slate-800/80'}`}
                                >
                                  <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center"><User className="w-3 h-3"/></div>
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{project.group_name}</h3>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-[11px] font-medium mb-3">
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                      <Calendar className="w-3 h-3" />
                                      {project.event_month || '-'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-450">
                                      <Calendar className="w-3 h-3" />
                                      {project.event_month || '-'}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-slate-800/60">
                                    {/* Crew avatars inside card */}
                                    {(() => {
                                      let crewList: CrewItem[] = [];
                                      if (typeof window !== 'undefined') {
                                        const saved = localStorage.getItem(`brief_crew_${project.whatsapp_group_id}`);
                                        if (saved) crewList = JSON.parse(saved);
                                      }
                                      
                                      if (crewList.length === 0) {
                                        return <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold italic select-none">No crew assigned</div>;
                                      }
                                      
                                      return (
                                        <div className="flex -space-x-1.5 overflow-hidden">
                                          {crewList.slice(0, 3).map((member, idx) => (
                                            <div 
                                              key={member.id || idx} 
                                              className="w-5.5 h-5.5 rounded-full border border-white dark:border-slate-900 bg-indigo-500 text-white flex items-center justify-center text-[8px] font-black uppercase shadow-sm select-none"
                                              title={`${member.name} (${member.role})`}
                                            >
                                              {member.name.slice(0, 2)}
                                            </div>
                                          ))}
                                          {crewList.length > 3 && (
                                            <div className="w-5.5 h-5.5 rounded-full border border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[7px] font-bold shadow-sm select-none">
                                              +{crewList.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    
                                    {/* Brief download button */}
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        downloadProjectBrief(project);
                                      }}
                                      className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center justify-center flex-shrink-0 cursor-pointer text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 shadow-sm transition-colors duration-150"
                                      title="Download Project Brief"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        )}

      </div>

      {/* Drawer Backdrop */}
      {selectedProject && (
        <div 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSelectedProject(null)}
        />
      )}

      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedProject ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedProject && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">{selectedProject.group_name}</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5 block">{selectedProject.whatsapp_group_id}</span>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-205 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Stage Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Project Stage / Status</label>
                <div className="relative">
                  <select 
                    value={selectedProject.status || 'Unassigned'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm appearance-none cursor-pointer"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="Pre-Prod">Pre-Prod</option>
                    <option value="Editing">Editing</option>
                    <option value="Revisions">Revisions</option>
                    <option value="Completed">Completed</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Section 2: Event Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Event Date / Start Date</label>
                <input 
                  type="date" 
                  value={parseEventMonthToDate(selectedProject.event_month)}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer"
                />
                {selectedProject.event_month && selectedProject.event_month !== 'Unknown' && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-md px-3 py-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Scheduled Event Date: <strong>{selectedProject.event_month}</strong></span>
                  </div>
                )}
              </div>

              {/* Section 3: Crew Assignments */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Crew & Staff Assignments
                </h4>
                
                {/* Add Crew Form */}
                <div className="grid grid-cols-1 gap-2 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg p-3">
                  <input 
                    type="text" 
                    placeholder="Staff Name"
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Role (e.g. Lead Film)"
                      value={crewRole}
                      onChange={(e) => setCrewRole(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
                    />
                    <input 
                      type="text" 
                      placeholder="Phone"
                      value={crewPhone}
                      onChange={(e) => setCrewPhone(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <button 
                    onClick={handleAddCrew}
                    className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-650 text-white font-medium rounded py-1.5 text-xs mt-1 transition-colors cursor-pointer"
                  >
                    Add Crew Member
                  </button>
                </div>

                {/* Crew List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {crew.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">No staff assigned yet.</p>
                  ) : (
                    crew.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 p-2.5 rounded-lg shadow-sm group">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{member.name} - <span className="text-blue-600 dark:text-blue-450">{member.role}</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">📞 {member.phone}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteCrew(member.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 4: Pinned Notes */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-slate-400" />
                  Pinned Notes & References
                </h4>

                {/* Add Pin Form */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-lg p-3 space-y-2">
                  <textarea 
                    rows={2}
                    placeholder="Write a reference link, shooting coordinate, or brief note..."
                    value={pinText}
                    onChange={(e) => setPinText(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-400 text-slate-800 dark:text-slate-200 resize-none font-sans"
                  />
                  <button 
                    onClick={handleAddPin}
                    className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-650 text-white font-medium rounded py-1.5 text-xs transition-colors cursor-pointer"
                  >
                    Pin Note
                  </button>
                </div>

                {/* Pinned Notes List */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pins.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-2">No pinned references yet.</p>
                  ) : (
                    pins.map((pin) => (
                      <div key={pin.id} className="flex items-start justify-between bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 p-2.5 rounded-lg shadow-sm group gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-all leading-normal">{pin.text}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">Pinned on: {pin.timestamp}</span>
                        </div>
                        <button 
                          onClick={() => handleDeletePin(pin.id)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-full transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
