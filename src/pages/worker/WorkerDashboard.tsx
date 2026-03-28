// Worker mobile UI — task list, task detail, and proof submission

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkerTasks } from '@/services/taskService';
import { createSubmission, uploadProofImage } from '@/services/submissionService';
import { useAuth } from '@/contexts/AuthContext';
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
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Camera API not supported in this browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (err) {
      toast.error('Could not access camera. Please allow permissions.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            stopCamera();
            if (!gps) {
              captureGps();
            }
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

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
    // Automatically capture GPS location when a photo is taken
    if (!gps) {
      captureGps();
    }
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
      setSelectedTask(null);
      setNotes(''); setImageFile(null); setImagePreview(null); setGps(null);
      stopCamera();
      setActiveTab('tasks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingTasks   = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div className="min-h-[100dvh] bg-surface text-on-surface font-body flex flex-col max-w-md mx-auto relative pt-4 pb-20 overflow-x-hidden">
      <header className="w-full fixed top-0 z-40 bg-[#0b1326]/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center px-6 py-4 max-w-md mx-auto right-0 left-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#2563EB]" style={{ fontVariationSettings: "'FILL' 1" }}>grid_view</span>
          <h1 className="text-xl font-black tracking-tighter text-slate-50 font-headline">CivicSync</h1>
        </div>
        <button onClick={signOut} className="w-10 h-10 rounded-full border border-primary/20 overflow-hidden flex items-center justify-center bg-primary/10 hover:bg-error/20 hover:text-error transition-colors text-primary active:scale-95">
           <span className="material-symbols-outlined text-sm">logout</span>
        </button>
      </header>

      <main className="px-6 space-y-8 flex-1 w-full pt-20">
        {activeTab === 'tasks' && (
          <section className="space-y-6 animate-fade-up w-full">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1 block">Operational Status</span>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-50 font-headline max-w-[200px] truncate leading-tight">{profile?.full_name?.split(' ')[0] ?? 'Worker'}'s Tasks</h2>
              </div>
              <span className="text-secondary text-[10px] font-bold bg-secondary/10 px-3 py-1 rounded-full border border-secondary/20 uppercase tracking-widest">{pendingTasks.length} Active</span>
            </div>

            <div className="flex flex-col gap-4">
              {isLoading ? (
                 Array.from({ length: 3 }).map((_, i) => (
                   <div key={i} className="bg-surface-container-low rounded-xl p-5 border border-white/5 animate-pulse h-32 w-full"></div>
                 ))
              ) : tasks.length === 0 ? (
                 <div className="bg-surface-container-low rounded-xl p-8 border border-white/5 text-center flex flex-col items-center w-full">
                   <span className="material-symbols-outlined text-4xl text-outline mb-3">check_circle</span>
                   <p className="text-slate-200 font-bold">You're all caught up!</p>
                   <p className="text-xs text-outline mt-1">No tasks assigned to you right now.</p>
                 </div>
              ) : (
                <>
                  {pendingTasks.map((task) => (
                    <div 
                      key={task.id} 
                      onClick={() => { 
                        setSelectedTask(task); 
                        setActiveTab('submit');
                        // Ensure we reset previous submissions UI states when switching tasks
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="group relative overflow-hidden bg-surface-container-low rounded-xl p-5 border border-white/5 transition-all duration-300 hover:bg-surface-container cursor-pointer active:scale-[0.98] w-full block"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-lg ${task.priority === 'high' || task.priority === 'critical' ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary'}`}>
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                            {task.priority === 'high' || task.priority === 'critical' ? 'warning' : 'engineering'}
                          </span>
                        </div>
                        <div className="flex flex-col items-end max-w-[50%]">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${task.status === 'in_progress' ? 'text-tertiary' : 'text-primary'} truncate max-w-full block`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-outline font-medium truncate max-w-full block">{task.priority} priority</span>
                        </div>
                      </div>
                      <div className="w-full">
                        <h3 className="text-lg font-bold text-slate-100 mb-1 truncate w-full block">{task.title}</h3>
                        <div className="flex items-center gap-2 text-outline-variant w-full">
                          <span className="material-symbols-outlined text-sm flex-shrink-0">near_me</span>
                          <span className="text-xs font-semibold truncate block flex-1">{task.location_name ?? 'Location not specified'}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full w-1/3 ${task.status === 'in_progress' ? 'bg-tertiary' : 'bg-primary'}`}></div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {completedTasks.length > 0 && <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline mt-4 block text-center w-full">Completed</span>}

                  {completedTasks.map((task) => (
                    <div key={task.id} className="bg-surface-container-lowest rounded-xl p-5 border border-white/5 opacity-70 w-full block">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-secondary-container/20 rounded-lg">
                          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">Completed</span>
                        </div>
                      </div>
                      <div className="w-full">
                        <h3 className="text-lg font-bold text-slate-400 mb-1 truncate line-through w-full block">{task.title}</h3>
                        <div className="flex items-center gap-2 text-outline-variant">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          <span className="text-xs font-semibold">Done</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </section>
        )}

        {activeTab === 'submit' && (
          <section className="space-y-6 animate-fade-up w-full">
            {!selectedTask ? (
              <div className="text-center pt-12">
                <span className="material-symbols-outlined text-5xl text-outline mb-4 flex justify-center w-full">assignment_return</span>
                <p className="text-slate-200 font-bold mb-2">No Task Selected</p>
                <p className="text-sm text-outline mb-6">Select a pending task to submit proof.</p>
                <button 
                  onClick={() => {
                    setActiveTab('tasks');
                    stopCamera();
                  }}
                  className="px-6 py-3 rounded-full bg-primary/10 text-primary font-bold text-sm tracking-widest uppercase hover:bg-primary/20 transition-colors w-full active:scale-95"
                >
                  Go to Tasks
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10"></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline whitespace-nowrap">Task Focus</span>
                  <span className="h-px flex-1 bg-white/10"></span>
                </div>
                
                <div className="bg-surface-container-low rounded-xl overflow-hidden border border-white/10 mb-8 w-full block">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-extrabold text-slate-100 leading-tight block w-full break-words">{selectedTask.title}</h3>
                    </div>
                    {selectedTask.description && (
                      <p className="text-on-surface-variant text-sm leading-relaxed max-w-full">
                        {selectedTask.description}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-surface-container p-3 rounded-lg border border-white/5 w-full block">
                        <span className="block text-[10px] font-bold uppercase text-outline mb-1">Time</span>
                        <span className="text-slate-200 font-bold text-xs truncate max-w-full block">{selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'ASAP'}</span>
                      </div>
                      <div className="bg-surface-container p-3 rounded-lg border border-white/5 w-full block">
                        <span className="block text-[10px] font-bold uppercase text-outline mb-1">Priority</span>
                        <span className={`font-bold capitalize text-xs truncate max-w-full block ${selectedTask.priority === 'high' || selectedTask.priority === 'critical' ? 'text-error' : 'text-primary'}`}>
                          {selectedTask.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-white/10"></span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline whitespace-nowrap">Verification</span>
                  <span className="h-px flex-1 bg-white/10"></span>
                </div>

                <div className="space-y-4 w-full">
                  <div className="w-full">
                    {showCamera ? (
                      <div className="relative rounded-xl overflow-hidden border border-border h-64 w-full bg-black block flex flex-col">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          muted 
                          className="w-full h-full object-cover"
                          onCanPlay={() => {
                            // Ensure the video scales properly when ready
                            if (videoRef.current && streamRef.current) {
                              videoRef.current.play().catch(e => console.error("Video play error:", e));
                            }
                          }}
                        />
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                          <button 
                            onClick={stopCamera}
                            className="bg-surface/80 backdrop-blur text-foreground px-4 py-2 rounded-full font-bold text-xs"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={takePhoto}
                            className="bg-primary/90 text-primary-foreground px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">camera</span> Snap
                          </button>
                        </div>
                      </div>
                    ) : imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-border h-48 w-full block">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                            startCamera();
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 hover:opacity-100 transition-opacity flex-col gap-2"
                        >
                          <span className="material-symbols-outlined text-4xl text-white">retweet</span>
                          <span className="text-white font-bold text-sm">Retake Photo</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={startCamera}
                        className="w-full border-2 border-dashed border-primary/30 bg-primary-container/5 rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition-colors hover:bg-primary-container/10 h-48 active:scale-[0.98]"
                      >
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                        </div>
                        <div className="w-full">
                          <span className="block text-slate-200 font-bold truncate">Open Camera</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-outline truncate block">Live capture with embedded geo-tags</span>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="bg-surface-container-highest/30 p-4 rounded-xl flex items-center justify-between border border-white/5 w-full gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>gps_fixed</span>
                        {gps && <span className="absolute -top-1 -right-1 w-2 h-2 bg-secondary rounded-full animate-pulse"></span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        {gps ? (
                          <>
                            <span className="block text-xs font-bold text-slate-200 truncate">Auto GPS Captured</span>
                            <span className="text-[10px] font-mono text-outline truncate block">{gps.lat.toFixed(4)}°, {gps.lon.toFixed(4)}°</span>
                          </>
                        ) : (
                           <span className="block text-xs font-bold text-slate-200 truncate pr-2">GPS Required for Proof</span>
                        )}
                      </div>
                    </div>
                    {gps ? (
                      <button onClick={() => setGps(null)} className="text-[10px] font-bold uppercase text-secondary bg-secondary/10 px-3 py-1.5 rounded flex-shrink-0">Reset</button>
                    ) : (
                      <button onClick={captureGps} disabled={gpsLoading} className="text-[10px] font-bold uppercase text-primary bg-primary/10 px-3 py-1.5 rounded flex-shrink-0 active:scale-95">
                         {gpsLoading ? 'Locating...' : 'Capture'}
                      </button>
                    )}
                  </div>

                  <div className="bg-surface-container-lowest rounded-xl border border-white/5 overflow-hidden w-full">
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add completion notes or issues encountered..." 
                      rows={3}
                      className="w-full bg-transparent border-none text-sm p-4 text-slate-200 focus:ring-0 placeholder:text-outline font-body resize-none"
                    ></textarea>
                  </div>

                  <button 
                    onClick={() => submitMutation.mutate()}
                    disabled={submitMutation.isPending || !gps || !imageFile}
                    className="w-full py-4 mt-4 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#B4C5FF] text-on-primary-container font-black uppercase tracking-widest text-sm shadow-[0_8px_24px_rgba(37,99,235,0.25)] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
                  >
                    {submitMutation.isPending ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '20px' }}>sync</span> : 'Submit Task Proof'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="space-y-6 animate-fade-up w-full">
            <div className="bg-surface-container-low rounded-xl p-6 border border-white/5 flex items-center gap-4 w-full block">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-primary">{profile?.full_name?.charAt(0) ?? 'W'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-slate-50 truncate max-w-full block">{profile?.full_name}</h2>
                <span className="text-sm font-medium text-slate-400 truncate max-w-full block">{profile?.email}</span>
                <span className="mt-2 text-[10px] flex items-center gap-1 font-bold uppercase tracking-widest text-primary truncate block w-full"><span className="material-symbols-outlined text-[10px] align-middle">badge</span> Field Operative</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#131b2e] rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center w-full block">
                <span className="material-symbols-outlined text-3xl text-primary mb-2 flex justify-center w-full">trending_up</span>
                <p className="text-2xl font-black font-headline text-slate-50 w-full block">{(profile?.performance_score ?? 7.5).toFixed(1)}</p>
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold mt-1 block w-full">Rating</p>
              </div>
              <div className="bg-[#131b2e] rounded-xl p-5 border border-white/5 flex flex-col items-center justify-center text-center w-full block">
                <span className="material-symbols-outlined text-3xl text-secondary mb-2 flex justify-center w-full">task_alt</span>
                <p className="text-2xl font-black font-headline text-slate-50 w-full block">{completedTasks.length}</p>
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold mt-1 block w-full">Completed</p>
              </div>
            </div>
            
            <div className="pt-8 flex justify-center">
              <button onClick={signOut} className="flex items-center gap-2 text-error text-sm font-bold bg-error/10 px-6 py-3 rounded-full active:scale-95 transition-all">
                <span className="material-symbols-outlined">logout</span> Sign Out
              </button>
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 z-50 flex justify-around items-center px-4 py-3 bg-[#131b2e]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] pb-safe max-w-md w-full mx-auto right-0 left-0">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center py-2 transition-all duration-300 flex-1 
          ${activeTab === 'tasks' ? 'text-[#B4C5FF] bg-gradient-to-br from-[#2563EB]/20 to-[#2563EB]/5 rounded-[12px] scale-105 mx-1 max-w-[100px]' : 'text-slate-500 hover:text-slate-300 active:scale-95 mx-1'}`}
        >
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: activeTab === 'tasks' ? "'FILL' 1" : "'FILL' 0" }}>assignment</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Tasks</span>
        </button>
        <button 
          onClick={() => setActiveTab('submit')}
          className={`flex flex-col items-center justify-center py-2 transition-all duration-300 flex-1 
          ${activeTab === 'submit' ? 'text-[#B4C5FF] bg-gradient-to-br from-[#2563EB]/20 to-[#2563EB]/5 rounded-[12px] scale-105 mx-1 max-w-[100px]' : 'text-slate-500 hover:text-slate-300 active:scale-95 mx-1'}`}
        >
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: activeTab === 'submit' ? "'FILL' 1" : "'FILL' 0" }}>photo_camera</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Submit</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center py-2 transition-all duration-300 flex-1 
          ${activeTab === 'profile' ? 'text-[#B4C5FF] bg-gradient-to-br from-[#2563EB]/20 to-[#2563EB]/5 rounded-[12px] scale-105 mx-1 max-w-[100px]' : 'text-slate-500 hover:text-slate-300 active:scale-95 mx-1'}`}
        >
          <span className="material-symbols-outlined mb-1" style={{ fontVariationSettings: activeTab === 'profile' ? "'FILL' 1" : "'FILL' 0" }}>account_circle</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.1em]">Profile</span>
        </button>
      </nav>
    </div>
  );
}
