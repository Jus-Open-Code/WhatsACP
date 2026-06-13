"use client";

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import toast, { Toaster } from 'react-hot-toast';
import { Calendar, Search, Plus, Filter, LayoutList, Download, Printer, Settings, MoreHorizontal, Edit2, X, ChevronDown, ChevronLeft, ChevronRight, User, Trash2, Pin } from 'lucide-react';
import { supabase } from '@/utils/supabase/client';

interface Project {
  id: number;
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

  useEffect(() => {
    setIsBrowser(true);
  }, []);

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

      // Realtime update to Supabase
      const { error } = await supabase
        .from('projects')
        .update({ status: destination.droppableId })
        .eq('id', parseInt(draggableId, 10));

      if (error) {
        console.error("Error updating status in Supabase:", error);
        toast.error("Failed to sync change to database.");
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
    <div className="bg-white min-h-screen text-slate-700 font-sans">
      <Toaster position="top-center" />
      
      {/* Top Header - Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-6 mt-1">
            <button 
              onClick={() => setView('list')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors -mb-[17px] ${view === 'list' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              List
            </button>
            <button 
              onClick={() => setView('kanban')}
              className={`pb-4 text-sm font-medium border-b-2 transition-colors -mb-[17px] ${view === 'kanban' ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Second Header - Filters & Search */}
      <div className="flex flex-wrap items-center justify-end px-6 py-3 border-b border-slate-100 bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search Tasks..." 
              className="pl-3 pr-8 py-1.5 border border-slate-200 rounded text-sm w-64 focus:outline-none focus:border-blue-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2" />
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
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-4 font-bold text-slate-700 text-sm">Title</th>
                  <th className="py-3 px-4 font-bold text-slate-700 text-sm">Start date</th>
                  <th className="py-3 px-4 font-bold text-slate-700 text-sm">Status</th>
                  <th className="py-3 px-2 text-right"><MoreHorizontal className="w-4 h-4 inline-block text-slate-500" /></th>
                </tr>
              </thead>
              <tbody>
                {projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 text-sm">No tasks found</td>
                  </tr>
                ) : (
                  projects.map((project, index) => (
                    <tr key={project.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                      <td 
                        onClick={() => setSelectedProject(project)}
                        className="py-3 px-4 text-sm font-medium text-blue-600 cursor-pointer hover:underline flex items-center gap-2"
                      >
                        {project.group_name}
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <Download className="w-3 h-3 text-white" />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">{project.event_month || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="bg-[#1a73e8] text-white text-xs px-2.5 py-1 rounded">
                          {project.status || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-1.5 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-400"><Edit2 className="w-3 h-3" /></button>
                          <button className="p-1.5 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-400"><X className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 text-sm text-slate-500">
              <div className="flex items-center gap-3">
                <div className="border border-slate-200 rounded px-2 py-1 flex items-center gap-2 bg-white">
                  10 <ChevronDown className="w-4 h-4" />
                </div>
                <span>1-{projects.length} / {projects.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:text-slate-800"><ChevronLeft className="w-4 h-4" /></button>
                <button className="px-3 py-1 border border-blue-500 text-blue-600 rounded bg-white">1</button>
                <button className="p-1 hover:text-slate-800"><ChevronRight className="w-4 h-4" /></button>
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
                    <div className={`bg-white rounded border-t-2 border-b border-l border-r border-slate-100 ${col.color} p-3 mb-2 flex justify-between items-center shadow-sm`}>
                      <h2 className="text-sm text-slate-600 font-medium">{col.id}</h2>
                      <span className="text-xs text-slate-500">{colProjects.length}</span>
                    </div>
                    
                    <Droppable droppableId={col.id}>
                      {(provided, snapshot) => (
                        <div 
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`flex flex-col gap-2 min-h-[100px] transition-colors rounded ${snapshot.isDraggingOver ? 'bg-slate-50/50' : ''}`}
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
                                  className={`bg-white p-4 rounded shadow-sm border cursor-pointer hover:border-slate-300 transition-colors ${snapshot.isDragging ? 'border-blue-400 shadow-md' : 'border-slate-100'}`}
                                >
                                  <div className="flex items-center gap-2 mb-3 text-slate-500">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-3 h-3"/></div>
                                    <h3 className="text-sm font-medium text-slate-700">{project.group_name}</h3>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-[11px] font-medium mb-3">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <Calendar className="w-3 h-3" />
                                      {project.event_month || '-'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-rose-500">
                                      <Calendar className="w-3 h-3" />
                                      {project.event_month || '-'}
                                    </div>
                                  </div>

                                  <div className="flex items-center">
                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                      <Download className="w-3 h-3 text-white" />
                                    </div>
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
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-100 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedProject ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedProject && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">{selectedProject.group_name}</h3>
                <span className="text-xs text-slate-400 font-mono mt-0.5 block">{selectedProject.whatsapp_group_id}</span>
              </div>
              <button 
                onClick={() => setSelectedProject(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Stage Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Project Stage / Status</label>
                <div className="relative">
                  <select 
                    value={selectedProject.status || 'Unassigned'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm appearance-none cursor-pointer"
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Event Date / Start Date</label>
                <input 
                  type="date" 
                  value={parseEventMonthToDate(selectedProject.event_month)}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm cursor-pointer"
                />
                {selectedProject.event_month && selectedProject.event_month !== 'Unknown' && (
                  <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Scheduled Event Date: <strong>{selectedProject.event_month}</strong></span>
                  </div>
                )}
              </div>

              {/* Section 3: Crew Assignments */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Crew & Staff Assignments
                </h4>
                
                {/* Add Crew Form */}
                <div className="grid grid-cols-1 gap-2 bg-slate-50/50 border border-slate-100 rounded-lg p-3">
                  <input 
                    type="text" 
                    placeholder="Staff Name"
                    value={crewName}
                    onChange={(e) => setCrewName(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="Role (e.g. Lead Film)"
                      value={crewRole}
                      onChange={(e) => setCrewRole(e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                    />
                    <input 
                      type="text" 
                      placeholder="Phone"
                      value={crewPhone}
                      onChange={(e) => setCrewPhone(e.target.value)}
                      className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <button 
                    onClick={handleAddCrew}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium rounded py-1.5 text-xs mt-1 transition-colors cursor-pointer"
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
                      <div key={member.id} className="flex items-center justify-between bg-white border border-slate-100 hover:border-slate-200 p-2.5 rounded-lg shadow-sm group">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs font-semibold text-slate-700 truncate">{member.name} - <span className="text-blue-600">{member.role}</span></p>
                          <p className="text-[10px] text-slate-400 mt-0.5">📞 {member.phone}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteCrew(member.id)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 4: Pinned Notes */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-4 h-4 text-slate-400" />
                  Pinned Notes & References
                </h4>

                {/* Add Pin Form */}
                <div className="bg-slate-50/50 border border-slate-100 rounded-lg p-3 space-y-2">
                  <textarea 
                    rows={2}
                    placeholder="Write a reference link, shooting coordinate, or brief note..."
                    value={pinText}
                    onChange={(e) => setPinText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-400 resize-none font-sans"
                  />
                  <button 
                    onClick={handleAddPin}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium rounded py-1.5 text-xs transition-colors cursor-pointer"
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
                      <div key={pin.id} className="flex items-start justify-between bg-white border border-slate-100 hover:border-slate-200 p-2.5 rounded-lg shadow-sm group gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-600 whitespace-pre-wrap break-all leading-normal">{pin.text}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">Pinned on: {pin.timestamp}</span>
                        </div>
                        <button 
                          onClick={() => handleDeletePin(pin.id)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors flex-shrink-0 mt-0.5 cursor-pointer"
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
