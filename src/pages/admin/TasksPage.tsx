// Tasks management page — create, view, assign tasks with AI suggestions

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, deleteTask } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { rankWorkersForTask } from '@/services/aiAssignment';
import { autoAssignTask } from '@/services/aiAssignment';
import { createTask } from '@/services/taskService';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Plus, Search, MapPin, Zap, Star, ChevronRight,
  Loader2, X, ClipboardList, Trash2, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{tasks.length} total tasks</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-glow-primary">
              <Plus className="w-4 h-4" /> Create Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-1 border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-primary" /> Create New Task
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
              {/* Left: form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Title *</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Fix water main on Oak Ave"
                    className="bg-surface-2 border-border focus:border-primary/50"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Detailed task description..."
                    rows={3}
                    className="bg-surface-2 border-border focus:border-primary/50 resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Location Name</Label>
                  <Input
                    value={form.location_name}
                    onChange={e => setForm(f => ({ ...f, location_name: e.target.value }))}
                    placeholder="Oak Ave & 5th St"
                    className="bg-surface-2 border-border focus:border-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Latitude *</Label>
                    <Input
                      value={form.latitude}
                      onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                      placeholder="40.7128"
                      className="bg-surface-2 border-border focus:border-primary/50 font-mono-data"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Longitude *</Label>
                    <Input
                      value={form.longitude}
                      onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                      placeholder="-74.0060"
                      className="bg-surface-2 border-border focus:border-primary/50 font-mono-data"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as typeof PRIORITIES[number] }))}>
                      <SelectTrigger className="bg-surface-2 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border">
                        {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="bg-surface-2 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border">
                        {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => createMutation.mutate(undefined)}
                    disabled={!form.title || !form.latitude || createMutation.isPending}
                    variant="outline"
                    className="flex-1 border-border text-foreground hover:bg-surface-2"
                  >
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Pending'}
                  </Button>
                </div>
              </div>

              {/* Right: AI panel */}
              <div className="space-y-4">
                <div className="card-surface-2 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">AI Assignment</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Score = (0.5 × performance) − (0.3 × distance_km)
                  </p>
                  <Button
                    type="button"
                    onClick={handleGetAiScores}
                    disabled={aiLoading || !form.latitude}
                    size="sm"
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                    variant="outline"
                  >
                    {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span className="ml-1.5">Compute AI Scores</span>
                  </Button>

                  {aiScores.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Workers</p>
                      {aiScores.map((ws, i) => (
                        <div
                          key={ws.worker.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-surface-1 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                          onClick={() => {
                            if (form.title && form.latitude) {
                              createMutation.mutate(ws.worker.id);
                            } else {
                              toast.error('Fill in title and coordinates first');
                            }
                          }}
                        >
                          <span className="text-xs font-mono-data text-muted-foreground w-4">{i + 1}</span>
                          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{ws.worker.full_name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{ws.worker.full_name}</p>
                            <p className="text-xs text-muted-foreground">{ws.distanceKm.toFixed(1)} km away</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold text-primary font-mono-data">{ws.score.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">score</p>
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      ))}
                      <Button
                        type="button"
                        onClick={() => {
                          if (form.title && form.latitude) {
                            createMutation.mutate(aiScores[0]?.worker.id);
                          } else {
                            toast.error('Fill in title and coordinates first');
                          }
                        }}
                        disabled={createMutation.isPending}
                        className="w-full mt-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-primary"
                        size="sm"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" />
                        Auto-Assign Best Worker
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 animate-fade-up delay-100">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 bg-surface-1 border-border focus:border-primary/50 w-56"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'pending', 'assigned', 'in_progress', 'completed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${statusFilter === s
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-transparent'
                }`}
            >
              {s === 'in_progress' ? 'In Progress' : s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks table */}
      <div className="card-surface shadow-card animate-fade-up delay-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Task', 'Priority', 'Status', 'Assigned To', 'Location', 'Due Date', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="shimmer h-3 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-foreground font-medium text-sm">No tasks found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first task'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(task => (
                  <tr key={task.id} className="hover:bg-surface-2/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{task.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{task.category}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={task.priority as any} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={task.status as any} />
                    </td>
                    <td className="px-5 py-3.5">
                      {task.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(workerMap[task.assigned_to]?.full_name ?? '?').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs text-foreground">{workerMap[task.assigned_to]?.full_name ?? 'Unknown'}</span>
                            {task.ai_assigned && (
                              <span className="ml-1 text-xs px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">
                          {task.location_name ?? `${task.latitude.toFixed(2)}, ${task.longitude.toFixed(2)}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleAutoAssign(task.id)}
                            title="AI Auto-Assign"
                            className="w-7 h-7 rounded-md flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this task?')) deleteMutation.mutate(task.id);
                          }}
                          title="Delete"
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
