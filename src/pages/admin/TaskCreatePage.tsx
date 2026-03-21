// Standalone task creation page at /admin/tasks/new
// Mirrors the dialog form in TasksPage but as a full page

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { rankWorkersForTask } from '@/services/aiAssignment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Zap, Loader2, ChevronRight, MapPin, ClipboardList } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface WorkerScore {
  worker: Profile;
  score: number;
  distanceKm: number;
  rank: number;
}

const CATEGORIES = ['general', 'infrastructure', 'sanitation', 'safety', 'utilities', 'parks', 'roads'];
const PRIORITIES  = ['low', 'medium', 'high', 'critical'] as const;

export default function TaskCreatePage() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { profile } = useAuth();

  const [form, setForm] = useState({
    title: '', description: '', location_name: '',
    latitude: '', longitude: '',
    priority: 'medium' as typeof PRIORITIES[number],
    category: 'general', due_date: '',
  });

  const [aiScores, setAiScores]   = useState<WorkerScore[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

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
      return createTask({
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
      });
    },
    onSuccess: () => {
      toast.success('Task created!');
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['taskStats'] });
      navigate('/admin/tasks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-up">
        <button
          onClick={() => navigate('/admin/tasks')}
          className="p-2 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Create New Task
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in task details and optionally AI-assign a worker</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Task form (3 cols) ── */}
        <div className="lg:col-span-3 card-surface p-6 shadow-card space-y-5 animate-fade-up delay-100">
          <h2 className="text-sm font-semibold text-foreground">Task Details</h2>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Title *</Label>
            <Input
              value={form.title} onChange={f('title')}
              placeholder="Fix water main on Oak Ave"
              className="bg-surface-2 border-border focus:border-primary/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
            <Textarea
              value={form.description} onChange={f('description')}
              placeholder="Detailed task description..."
              rows={4}
              className="bg-surface-2 border-border focus:border-primary/50 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location Name</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={form.location_name} onChange={f('location_name')}
                placeholder="Oak Ave & 5th St"
                className="pl-8 bg-surface-2 border-border focus:border-primary/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Latitude *</Label>
              <Input
                value={form.latitude} onChange={f('latitude')}
                placeholder="40.7128"
                className="bg-surface-2 border-border focus:border-primary/50 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Longitude *</Label>
              <Input
                value={form.longitude} onChange={f('longitude')}
                placeholder="-74.0060"
                className="bg-surface-2 border-border focus:border-primary/50 font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as typeof PRIORITIES[number] }))}>
                <SelectTrigger className="bg-surface-2 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-1 border-border">
                  {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
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
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Due Date</Label>
            <Input
              type="date"
              value={form.due_date} onChange={f('due_date')}
              className="bg-surface-2 border-border focus:border-primary/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-surface-2"
              onClick={() => navigate('/admin/tasks')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(undefined)}
              disabled={!form.title || !form.latitude || createMutation.isPending}
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-surface-2"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save as Pending'}
            </Button>
          </div>
        </div>

        {/* ── AI panel (2 cols) ── */}
        <div className="lg:col-span-2 space-y-4 animate-fade-up delay-200">
          <div className="card-surface p-5 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">AI Assignment</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Score = (0.5 × performance) − (0.3 × distance_km)<br />
              Workers are ranked by proximity and past performance.
            </p>

            <Button
              onClick={handleGetAiScores}
              disabled={aiLoading || !form.latitude || !form.longitude}
              size="sm"
              className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
              variant="outline"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
              Compute AI Scores
            </Button>

            {aiScores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Top Workers</p>
                {aiScores.map((ws, i) => (
                  <button
                    key={ws.worker.id}
                    className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-surface-2 border border-border hover:border-primary/40 transition-colors group text-left"
                    onClick={() => {
                      if (!form.title || !form.latitude) {
                        toast.error('Fill in title and coordinates first'); return;
                      }
                      createMutation.mutate(ws.worker.id);
                    }}
                  >
                    <span className="text-xs font-mono text-muted-foreground w-4 flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">{ws.worker.full_name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ws.worker.full_name}</p>
                      <p className="text-xs text-muted-foreground">{ws.distanceKm.toFixed(1)} km away</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-primary font-mono">{ws.score.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">score</p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}

                <Button
                  onClick={() => {
                    if (!form.title || !form.latitude) {
                      toast.error('Fill in title and coordinates first'); return;
                    }
                    createMutation.mutate(aiScores[0]?.worker.id);
                  }}
                  disabled={createMutation.isPending}
                  className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-primary"
                  size="sm"
                >
                  {createMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    : <Zap className="w-3.5 h-3.5 mr-1.5" />}
                  Auto-Assign Best Worker
                </Button>
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div className="card-surface p-4 shadow-card">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 <span className="text-foreground font-medium">Tip:</span> Enter the task coordinates first, then click <em>Compute AI Scores</em> to see ranked workers. Click any worker to create the task and assign it directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
