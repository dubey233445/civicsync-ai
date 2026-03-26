// Tasks management page — create, view, assign tasks with AI suggestions

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchTasks, deleteTask } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { rankWorkersForTask } from '@/services/aiAssignment';
import { autoAssignTask } from '@/services/aiAssignment';
import { createTask } from '@/services/taskService';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, MapPin, Zap, ChevronRight,
  Loader2, ClipboardList, Trash2, ExternalLink, Map as MapIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Task    = Database['public']['Tables']['tasks']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface WorkerScore {
  worker: Profile;
  score: number;
  distanceKm: number;
  rank: number;
}

const CATEGORIES = ['general', 'infrastructure', 'sanitation', 'safety', 'utilities', 'parks', 'roads'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export default function TasksPage() {
  const { profile }  = useAuth();
  const qc           = useQueryClient();
  const navigate     = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [aiScores, setAiScores]     = useState<WorkerScore[]>([]);
  const [aiLoading, setAiLoading]   = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', location_name: '',
    latitude: '', longitude: '',
    priority: 'medium' as typeof PRIORITIES[number],
    category: 'general', due_date: '',
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 20_000,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Get AI scores when lat/lon are filled
  const handleGetAiScores = async () => {
    if (!form.latitude || !form.longitude) {
      toast.error('Enter latitude and longitude first'); return;
    }
    setAiLoading(true);
    const task = { latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
    const ranked = rankWorkersForTask(workers, task);
    setAiScores(ranked.slice(0, 5));
    setAiLoading(false);
  };

  const createMutation = useMutation({
    mutationFn: async (assignTo?: string) => {
      if (!profile) throw new Error('Not authenticated');
      const payload: Parameters<typeof createTask>[0] = {
        title:         form.title,
        description:   form.description || null,
        location_name: form.location_name || null,
        latitude:      parseFloat(form.latitude) || 0,
        longitude:     parseFloat(form.longitude) || 0,
        priority:      form.priority,
        category:      form.category,
        due_date:      form.due_date || null,
        created_by:    profile.id,
        assigned_to:   assignTo ?? null,
        status:        assignTo ? 'assigned' : 'pending',
      };
      return createTask(payload);
    },
    onSuccess: () => {
      toast.success('Task created!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['taskStats'] });
      setCreateOpen(false);
      setForm({ title: '', description: '', location_name: '', latitude: '', longitude: '', priority: 'medium', category: 'general', due_date: '' });
      setAiScores([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleAutoAssign = async (taskId: string) => {
    const t = tasks.find(t => t.id === taskId);
    if (!t) return;
    try {
      const result = await autoAssignTask(taskId, t.latitude, t.longitude);
      if (result) {
        toast.success(`Assigned to ${result.worker.full_name} (score: ${result.score.toFixed(2)})`);
        qc.invalidateQueries({ queryKey: ['tasks'] });
      } else {
        toast.error('No available workers');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success('Task deleted');
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100 font-headline tracking-tight">Active Operations</h1>
          <p className="font-body text-sm text-on-surface-variant mt-1">{tasks.length} total assignments globally active</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold tracking-wide rounded-xl px-6 py-2 h-auto shadow-lg shadow-[#2563EB]/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add_task</span> Initialize Operation
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface border-none shadow-2xl shadow-black/50 max-w-6xl w-[90vw] p-0 overflow-hidden rounded-2xl h-[85vh] flex flex-col">
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Task Creation Form */}
              <section className="w-1/2 flex flex-col overflow-y-auto bg-surface-container border-r border-white/5 p-8">
                <header className="mb-8">
                  <h2 className="font-headline text-2xl font-bold text-on-surface tracking-tight">Operation Details</h2>
                  <p className="font-body text-sm text-on-surface-variant mt-1">Specify parameters for algorithmic matching and assignment.</p>
                </header>
                <form className="space-y-6 flex-1">
                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Title</label>
                    <input 
                      className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body placeholder:text-outline/50" 
                      placeholder="e.g. Traffic Signal Repair" 
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Category</label>
                      <select 
                        className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body capitalize"
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Due Date</label>
                      <input 
                        className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body" 
                        type="date"
                        value={form.due_date}
                        onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Location Name</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">location_on</span>
                      <input 
                        className="w-full bg-surface-container-highest border-none rounded-xl py-4 pl-12 pr-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body placeholder:text-outline/50" 
                        placeholder="Street Address or Area" 
                        value={form.location_name}
                        onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Latitude</label>
                      <input 
                        className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body font-mono placeholder:text-outline/50" 
                        placeholder="e.g. 40.7128" 
                        type="number" step="any"
                        value={form.latitude}
                        onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Longitude</label>
                      <input 
                        className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body font-mono placeholder:text-outline/50" 
                        placeholder="e.g. -74.0060" 
                        type="number" step="any"
                        value={form.longitude}
                        onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Priority Level</label>
                    <div className="flex gap-2">
                      {PRIORITIES.map(p => (
                        <button 
                          key={p}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, priority: p }))}
                          className={`flex-1 py-3 rounded-xl border font-label text-xs tracking-wider uppercase transition-all
                            ${form.priority === p 
                              ? p === 'critical' || p === 'high' 
                                ? 'border-error/50 bg-error/10 text-error font-bold' 
                                : 'border-primary/50 bg-primary/10 text-primary font-bold'
                              : 'border-white/5 bg-surface-container-lowest text-on-surface-variant hover:border-white/20'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Objectives / Notes</label>
                    <textarea 
                      className="w-full bg-surface-container-highest border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary transition-all font-body resize-none placeholder:text-outline/50" 
                      placeholder="Deployment objectives and safety protocols..." 
                      rows={3}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    ></textarea>
                  </div>
                  
                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => createMutation.mutate(undefined)}
                      disabled={!form.title || !form.latitude || createMutation.isPending}
                      className="flex-1 border border-white/10 hover:bg-white/5 py-4 rounded-xl text-slate-300 font-headline font-bold text-sm active:scale-95 transition-all text-center"
                    >
                      {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save as Pending Operation'}
                    </button>
                    <button 
                      type="button"
                      onClick={handleGetAiScores}
                      disabled={aiLoading || !form.latitude || !form.longitude}
                      className="bg-primary/20 hover:bg-primary/30 text-primary py-4 px-6 rounded-xl font-headline font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2 border border-primary/30"
                    >
                      {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>}
                      Compute AI Scoring
                    </button>
                  </div>
                </form>
              </section>

              {/* Right: AI Panel & Match view */}
              <section className="w-1/2 flex flex-col p-8 bg-[#060e20] relative">
                <div className="flex-1 bg-surface-container-low rounded-xl flex flex-col shadow-2xl border border-white/5 overflow-hidden">
                  <header className="p-6 border-b border-white/5 flex justify-between items-center bg-surface-container">
                    <div>
                      <h3 className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                         <span className="material-symbols-outlined text-primary">psychiatry</span>
                         AI Match Results
                      </h3>
                      <p className="font-body text-xs text-on-surface-variant mt-1">Algorithmic ranking based on performance and proximity.</p>
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {!aiScores.length ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 font-thin">person_search</span>
                        <p className="text-sm font-medium">Input operation coordinates and initialize AI search to match personnel.</p>
                      </div>
                    ) : (
                       <>
                         {aiScores.map((ws, i) => (
                           <div key={ws.worker.id} className="flex items-center p-4 rounded-xl bg-surface-container-high border border-white/5 hover:bg-surface-container-highest hover:border-primary/30 transition-all group">
                             <div className="w-8 flex-shrink-0 text-center text-xs font-mono font-bold text-on-surface-variant">
                                #{i + 1}
                             </div>
                             <div className="relative h-12 w-12 rounded-full border-2 border-primary/40 p-0.5">
                               <div className="h-full w-full bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">
                                 {ws.worker.full_name.charAt(0)}
                               </div>
                               <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 bg-secondary rounded-full border-2 border-surface-container-high"></div>
                             </div>
                             <div className="ml-4 flex-1">
                               <h4 className="font-headline font-bold text-on-surface text-base">{ws.worker.full_name}</h4>
                               <div className="flex items-center gap-3 mt-0.5">
                                 <span className="font-body text-xs text-on-surface-variant flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">distance</span> {ws.distanceKm.toFixed(1)} km
                                 </span>
                                 <span className="h-1 w-1 rounded-full bg-outline-variant"></span>
                                 <span className="font-body text-xs text-primary">{ws.worker.region || 'Unassigned Area'}</span>
                               </div>
                             </div>
                             <div className="text-right px-4">
                               <div className="font-headline font-extrabold text-primary text-xl">{(ws.score * 10).toFixed(1)}</div>
                               <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Match</div>
                             </div>
                             <button 
                               onClick={() => {
                                 if (form.title) {
                                   createMutation.mutate(ws.worker.id);
                                 } else {
                                   toast.error('Title is required to create a task');
                                 }
                               }}
                               disabled={createMutation.isPending}
                               className="h-10 w-10 bg-primary-container text-white rounded-full flex items-center justify-center hover:bg-primary hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                             >
                               <span className="material-symbols-outlined text-[18px]">add</span>
                             </button>
                           </div>
                         ))}
                         
                         <div className="pt-6 mt-6 border-t border-white/5">
                           <button 
                             onClick={() => {
                               if (form.title) {
                                 createMutation.mutate(aiScores[0]?.worker.id);
                               } else {
                                 toast.error('Title is required to create a task');
                               }
                             }}
                             disabled={createMutation.isPending}
                             className="w-full bg-[#2563EB] hover:bg-[#B4C5FF] hover:text-[#00174B] py-4 rounded-xl text-white font-headline font-black text-sm uppercase tracking-widest shadow-[0_8px_32px_rgba(37,99,235,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                             <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_fix_high</span>
                             Auto-Deploy Top Match
                           </button>
                         </div>
                       </>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Area */}
      <div className="bg-surface-container-low border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
          <Input
            placeholder="Search operations..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-surface-container border-none focus-visible:ring-1 focus-visible:ring-primary w-64 rounded-xl font-body h-10 text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block"></div>
        <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
          {['all', 'pending', 'assigned', 'in_progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all capitalize
                ${statusFilter === s
                  ? 'bg-outline-variant/30 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Table (Bento Formatted) */}
      <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left font-body">
            <thead>
              <tr className="border-b border-outline-variant/20">
                {['Operation', 'Status', 'Personnel', 'Deployment Zone', 'Deadline', 'Actions'].map(h => (
                  <th key={h} className="pb-4 px-4 font-label text-[10px] uppercase tracking-[0.15em] text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 text-sm">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4" colSpan={6}>
                      <div className="h-6 bg-surface-container-highest animate-pulse rounded-md w-full opacity-50"></div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center opacity-50">
                      <span className="material-symbols-outlined text-5xl text-outline mb-4">search_off</span>
                      <p className="text-slate-200 font-bold mb-1">No Operations Located</p>
                      <p className="text-xs text-outline">Adjust query vectors or initialize a new operation.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(task => (
                  <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-2.5 rounded-lg shrink-0 ${task.priority === 'critical' ? 'bg-error-container/20 text-error' : task.priority === 'high' ? 'bg-[#ffb596]/10 text-[#ffb596]' : 'bg-[#131b2e] text-primary'}`}>
                           <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                             {task.priority === 'critical' || task.priority === 'high' ? 'warning' : 'engineering'}
                           </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-100 truncate">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{task.category}</span>
                            <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-bold ${task.priority === 'critical' ? 'bg-error/10 text-error' : task.priority === 'high' ? 'bg-tertiary/10 text-tertiary' : 'text-primary'}`}>
                               {task.priority} Priority
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/5 bg-[#131b2e]">
                        <span className={`h-2 w-2 rounded-full ${task.status === 'completed' ? 'bg-secondary' : task.status === 'in_progress' ? 'bg-primary' : task.status === 'assigned' ? 'bg-tertiary' : 'bg-slate-500'}`}></span>
                        <span className="text-xs font-bold text-slate-300 capitalize">{task.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {task.assigned_to ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex flex-shrink-0 items-center justify-center text-primary font-bold text-xs">
                            {(workerMap[task.assigned_to]?.full_name ?? '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-200 block truncate">{workerMap[task.assigned_to]?.full_name ?? 'Unknown'}</span>
                            {task.ai_assigned && (
                              <span className="text-[9px] uppercase tracking-widest text-[#7bd0ff] font-bold mt-0.5 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[10px]">psychiatry</span> AI Verified
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-[16px]">map</span>
                        <span className="text-xs font-medium truncate max-w-[150px]">
                          {task.location_name ?? `${task.latitude.toFixed(3)}°, ${task.longitude.toFixed(3)}°`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs font-mono font-medium text-slate-400 bg-black/20 px-2 py-1 rounded">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Continuous'}
                      </span>
                    </td>
                     <td className="py-4 px-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleAutoAssign(task.id)}
                            className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 hover:scale-105 transition-all"
                            title="AI Auto-Assign"
                          >
                            <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/tasks/${task.id}`)}
                          className="h-8 w-8 rounded-lg bg-[#131b2e] border border-white/5 text-slate-300 flex items-center justify-center hover:bg-white/10 transition-all"
                          title="View Intelligence"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        </button>
                        <button
                          onClick={() => { if (confirm('Purge this operational record?')) deleteMutation.mutate(task.id); }}
                          className="h-8 w-8 rounded-lg bg-error/10 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all ml-1"
                          title="Purge Record"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
