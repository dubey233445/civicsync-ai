// Worker mobile UI — task list, task detail, and proof submission

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkerTasks } from '@/services/taskService';
import { createSubmission, uploadProofImage } from '@/services/submissionService';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import {
  MapPin, Camera, Navigation, Send, Star,
  ClipboardList, CheckCircle2, Clock, Loader2, X, Zap, LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Task = Database['public']['Tables']['tasks']['Row'];

export default function WorkerDashboard() {
  const { profile, signOut } = useAuth();
  const qc = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lon: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'submit' | 'profile'>('tasks');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['workerTasks', profile?.id],
    queryFn: () => fetchWorkerTasks(profile!.id),
    enabled: !!profile?.id,
    refetchInterval: 30_000,
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const captureGps = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        toast.success('Location captured!');
        setGpsLoading(false);
      },
      () => { toast.error('Could not get location'); setGpsLoading(false); }
    );
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !selectedTask) throw new Error('Not ready');
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadProofImage(imageFile, profile.id);
      }
      return createSubmission({
        task_id: selectedTask.id,
        user_id: profile.id,
        image_url: imageUrl ?? null,
        latitude:  gps?.lat ?? null,
        longitude: gps?.lon ?? null,
        notes:     notes || null,
      });
    },
    onSuccess: () => {
      toast.success('Proof submitted successfully! 🎉');
      qc.invalidateQueries({ queryKey: ['workerTasks'] });
      setSelectedTask(null);
      setNotes(''); setImageFile(null); setImagePreview(null); setGps(null);
      setActiveTab('tasks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingTasks   = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="px-4 pt-6 pb-4 border-b border-border bg-surface-1 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-base font-bold text-foreground">Civic<span className="text-primary">Sync</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{profile?.full_name?.charAt(0) ?? 'W'}</span>
            </div>
            <button onClick={signOut} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Welcome back, {profile?.full_name?.split(' ')[0] ?? 'Worker'}</p>
      </header>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px bg-border mx-4 mt-4 rounded-xl overflow-hidden">
        {[
          { label: 'Assigned', value: pendingTasks.length, color: 'text-primary' },
          { label: 'Completed', value: completedTasks.length, color: 'text-secondary' },
          { label: 'Score', value: `${(profile?.performance_score ?? 7.5).toFixed(1)}`, color: 'text-amber-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-1 px-4 py-3 text-center">
            <p className={`text-lg font-bold font-mono-data tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mx-4 mt-4 p-1 bg-surface-2 rounded-xl">
        {[
          { id: 'tasks',   label: 'My Tasks',  icon: ClipboardList },
          { id: 'submit',  label: 'Submit',     icon: Camera },
          { id: 'profile', label: 'Profile',    icon: Star },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all
              ${activeTab === id
                ? 'bg-primary text-primary-foreground shadow-glow-primary'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-auto">
        {/* Tasks tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="card-surface p-4">
                  <div className="shimmer h-4 rounded w-2/3 mb-2" />
                  <div className="shimmer h-3 rounded w-full mb-3" />
                  <div className="shimmer h-3 rounded w-1/3" />
                </div>
              ))
            ) : tasks.length === 0 ? (
              <div className="card-surface p-8 text-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium text-sm">No tasks assigned</p>
                <p className="text-xs text-muted-foreground mt-1">Your admin will assign tasks soon</p>
              </div>
            ) : (
              tasks.map((task, i) => (
                <div
                  key={task.id}
                  className="card-surface p-4 hover:shadow-card-hover transition-all duration-200 cursor-pointer animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => { setSelectedTask(task); setActiveTab('submit'); }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2">{task.title}</h3>
                    <StatusBadge status={task.status as any} />
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{task.location_name ?? 'No location'}</span>
                    </div>
                    <PriorityBadge priority={task.priority as any} />
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Due {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {task.status !== 'completed' && task.status !== 'cancelled' && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-primary font-medium">Tap to submit proof →</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Submit tab */}
        {activeTab === 'submit' && (
          <div className="space-y-4">
            {/* Task selector */}
            {!selectedTask ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Select a task to submit proof for:</p>
                <div className="space-y-2">
                  {pendingTasks.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="w-full text-left card-surface p-3 hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.location_name}</p>
                    </button>
                  ))}
                  {pendingTasks.length === 0 && (
                    <div className="card-surface p-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-secondary mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium">All tasks complete!</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-up">
                {/* Selected task info */}
                <div className="card-surface-2 p-3 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Submitting proof for</p>
                      <p className="text-sm font-semibold text-foreground">{selectedTask.title}</p>
                    </div>
                    <button onClick={() => setSelectedTask(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Photo upload */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Photo Proof
                  </label>
                  <label className="block cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" />
                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40 opacity-0 hover:opacity-100 transition-opacity">
                          <Camera className="w-8 h-8 text-foreground" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-36 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors bg-surface-2">
                        <Camera className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Tap to take photo or upload</p>
                      </div>
                    )}
                  </label>
                </div>

                {/* GPS */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    GPS Location
                  </label>
                  {gps ? (
                    <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/20 rounded-xl">
                      <MapPin className="w-4 h-4 text-secondary" />
                      <span className="text-xs text-secondary font-mono-data">
                        {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}
                      </span>
                      <button onClick={() => setGps(null)} className="ml-auto text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={captureGps}
                      disabled={gpsLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all bg-surface-2"
                    >
                      {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                      {gpsLoading ? 'Getting location...' : 'Capture GPS Location'}
                    </button>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">Notes</label>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Describe what was done, any issues encountered..."
                    rows={3}
                    className="bg-surface-2 border-border focus:border-primary/50 resize-none text-sm"
                  />
                </div>

                {/* Submit button */}
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-glow-primary active:scale-[0.98] transition-all py-6"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Send className="w-5 h-5 mr-2" />
                  )}
                  Submit Task Proof
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Profile tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-up">
            <div className="card-surface p-5 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center mx-auto mb-3 glow-primary">
                <span className="text-2xl font-bold text-primary">{profile?.full_name?.charAt(0) ?? 'W'}</span>
              </div>
              <h2 className="text-base font-bold text-foreground">{profile?.full_name}</h2>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
              {profile?.region && <p className="text-xs text-muted-foreground mt-0.5">{profile.region}</p>}
            </div>

            {/* Score card */}
            <div className="card-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" /> Performance Score
                </h3>
                <span className="text-xl font-bold text-amber-400 font-mono-data">
                  {(profile?.performance_score ?? 7.5).toFixed(1)}/10
                </span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-2.5">
                <div
                  className="h-2.5 rounded-full score-gradient transition-all duration-700"
                  style={{ width: `${((profile?.performance_score ?? 7.5) / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-surface p-4 text-center">
                <p className="text-xl font-bold text-primary font-mono-data">{pendingTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Active Tasks</p>
              </div>
              <div className="card-surface p-4 text-center">
                <p className="text-xl font-bold text-secondary font-mono-data">{completedTasks.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
