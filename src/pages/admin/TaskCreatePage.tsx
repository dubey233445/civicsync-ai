// Standalone task creation page at /admin/tasks/new
// Full form + click-to-place map picker + AI assignment panel

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTask } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { rankWorkersForTask } from '@/services/aiAssignment';
import { useAuth } from '@/contexts/AuthContext';
import { LocationPicker } from '@/components/LocationPicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Zap, Loader2, ChevronRight, MapPin, ClipboardList, MousePointerClick, Search, Crosshair } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming this exists, if not we will implement it or just use setTimeout
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface WorkerScore {
  worker: Profile;
  score: number;
  distanceKm: number;
  rank: number;
}

interface LocationSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const CATEGORIES = ['general', 'infrastructure', 'sanitation', 'safety', 'utilities', 'parks', 'roads'];
const PRIORITIES  = ['low', 'medium', 'high', 'critical'] as const;

export default function TaskCreatePage() {
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const workerIdParam = searchParams.get('worker_id');
  const qc          = useQueryClient();
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

  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedLocationName = useDebounce(form.location_name, 500);

  useEffect(() => {
    if (!debouncedLocationName || debouncedLocationName.length < 3) {
      setSuggestions([]);
      return;
    }
    
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedLocationName)}&limit=5`);
        const data = await res.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    };
    fetchSuggestions();
  }, [debouncedLocationName]);

  const handleSuggestionClick = (s: LocationSuggestion) => {
    setForm(prev => ({
      ...prev,
      location_name: s.display_name,
      latitude: parseFloat(s.lat).toFixed(6),
      longitude: parseFloat(s.lon).toFixed(6)
    }));
    setShowSuggestions(false);
    setAiScores([]);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    const toastId = toast.loading('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss(toastId);
        toast.success('Location found');
        setForm(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6)
        }));
        setAiScores([]);
      },
      (err) => {
        toast.dismiss(toastId);
        toast.error('Unable to retrieve your location');
      }
    );
  };


  // Called by LocationPicker when user clicks/drags on map
  const handleMapPick = useCallback(({ lat, lng }: { lat: number; lng: number }) => {
    setForm(prev => ({
      ...prev,
      latitude:  lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    // Clear stale AI scores when location changes
    setAiScores([]);
  }, []);

  const handleGetAiScores = async () => {
    if (!form.latitude || !form.longitude) {
      toast.error('Pick a location on the map first'); return;
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

  const parsedLat = parseFloat(form.latitude);
  const parsedLng = parseFloat(form.longitude);
  const hasCoords = !isNaN(parsedLat) && !isNaN(parsedLng) && form.latitude !== '' && form.longitude !== '';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
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
          <p className="text-sm text-muted-foreground mt-0.5">
            Fill in task details · click the map to pin a location · AI-assign a worker
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Column 1: Task form ── */}
        <div className="card-surface p-6 shadow-card space-y-5 animate-fade-up delay-100">
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
              placeholder="Detailed task description…"
              rows={3}
              className="bg-surface-2 border-border focus:border-primary/50 resize-none"
            />
          </div>

          <div className="space-y-1.5 relative">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Location Name</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={form.location_name} 
                onChange={(e) => {
                  f('location_name')(e);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Oak Ave & 5th St"
                className="pl-8 bg-surface-2 border-border focus:border-primary/50"
              />
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-surface-1 border border-border rounded-md shadow-lg overflow-hidden">
                {suggestions.map(s => (
                  <div
                    key={s.place_id}
                    className="px-3 py-2 text-sm text-foreground hover:bg-surface-2 cursor-pointer border-b border-border last:border-0 truncate"
                    onClick={() => handleSuggestionClick(s)}
                  >
                    {s.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coordinate read-outs (editable but also filled by map click) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Latitude</Label>
              <Input
                value={form.latitude}
                onChange={e => {
                  setForm(p => ({ ...p, latitude: e.target.value }));
                  setAiScores([]);
                }}
                placeholder="click map ↓"
                className="bg-surface-2 border-border focus:border-primary/50 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Longitude</Label>
              <Input
                value={form.longitude}
                onChange={e => {
                  setForm(p => ({ ...p, longitude: e.target.value }));
                  setAiScores([]);
                }}
                placeholder="click map ↓"
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

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-border text-foreground hover:bg-surface-2"
              onClick={() => navigate('/admin/tasks')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate(workerIdParam || undefined)}
              disabled={!form.title || !hasCoords || createMutation.isPending}
              variant="outline"
              className={`flex-1 border-border transition-colors ${workerIdParam ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20' : 'text-foreground hover:bg-surface-2'}`}
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (workerIdParam ? 'Save and Assign' : 'Save as Pending')}
            </Button>
          </div>
        </div>

        {/* ── Column 2: Map picker ── */}
        <div className="space-y-3 animate-fade-up delay-150">
          <div className="card-surface shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <MousePointerClick className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium text-foreground">Click to Pin Location</span>
              {hasCoords && (
                <span className="ml-auto text-xs font-mono text-muted-foreground">
                  {parsedLat.toFixed(4)}, {parsedLng.toFixed(4)}
                </span>
              )}
              <Button 
                variant="outline" 
                size="icon" 
                className="h-6 w-6 ml-2 rounded-full border-border bg-surface-2 hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-50"
                onClick={handleLocateMe}
                title="Use current location"
              >
                <Crosshair className="w-3.5 h-3.5" />
              </Button>
            </div>
            <LocationPicker
              lat={hasCoords ? parsedLat : undefined}
              lng={hasCoords ? parsedLng : undefined}
              onChange={handleMapPick}
              className="w-full h-[380px]"
            />
          </div>

          {!hasCoords && (
            <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
              <MousePointerClick className="w-3 h-3" />
              Click anywhere on the map to set coordinates · drag pin to adjust
            </p>
          )}
        </div>

        {/* ── Column 3: AI Assignment or Direct Assignment ── */}
        <div className="space-y-4 animate-fade-up delay-200">
          <div className="card-surface p-5 shadow-card space-y-4">
            {workerIdParam ? (() => {
               const preselectedWorker = workers.find(w => w.id === workerIdParam);
               return (
                 <div className="space-y-4">
                   <div className="flex items-center gap-2">
                     <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                     <h2 className="text-sm font-semibold text-foreground">Direct Assignment</h2>
                   </div>
                   <p className="text-xs text-muted-foreground leading-relaxed">
                     You are creating a task directly assigned to a specific operative.
                   </p>
                   {preselectedWorker ? (
                     <div className="p-3 bg-surface-2 rounded-lg border border-border flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                         <span className="text-primary font-bold">{preselectedWorker.full_name.charAt(0)}</span>
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-sm font-bold text-foreground truncate">{preselectedWorker.full_name}</p>
                         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Operative</p>
                       </div>
                     </div>
                   ) : (
                     <div className="p-3 bg-surface-2 rounded-lg border border-border text-xs text-muted-foreground text-center">
                       Loading operative details...
                     </div>
                   )}
                   <Button
                     onClick={() => {
                       if (!form.title) { toast.error('Enter a title first'); return; }
                       createMutation.mutate(workerIdParam);
                     }}
                     disabled={createMutation.isPending || !form.title || !hasCoords}
                     className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-primary"
                   >
                     {createMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <span className="material-symbols-outlined text-[16px] mr-1.5">assignment_ind</span>}
                     Assign to Operative
                   </Button>
                 </div>
               );
            })() : (
              <>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">AI Assignment</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Score = (0.5 × performance) − (0.3 × distance_km)<br />
                  Workers ranked by proximity and past performance.
                </p>

                <Button
                  onClick={handleGetAiScores}
                  disabled={aiLoading || !hasCoords}
                  size="sm"
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30"
                  variant="outline"
                >
                  {aiLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    : <Zap className="w-3.5 h-3.5 mr-1.5" />
                  }
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
                          if (!form.title) { toast.error('Enter a title first'); return; }
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
                        <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                      </button>
                    ))}

                    <Button
                      onClick={() => {
                        if (!form.title) { toast.error('Enter a title first'); return; }
                        createMutation.mutate(aiScores[0]?.worker.id);
                      }}
                      disabled={createMutation.isPending}
                      className="w-full mt-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-primary"
                      size="sm"
                    >
                      {createMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        : <Zap className="w-3.5 h-3.5 mr-1.5" />
                      }
                      Auto-Assign Best Worker
                    </Button>
                  </div>
                )}

                {!hasCoords && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Pin a location on the map first to enable AI scoring.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Tip card */}
          <div className="card-surface p-4 shadow-card">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 <span className="text-foreground font-medium">Workflow:</span> Click the map to set coordinates →
              compute AI scores → click a worker or hit <em>Auto-Assign</em> to create and assign in one step.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
