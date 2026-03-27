// Worker Detail Page — /admin/workers/:id
// Shows worker profile, assigned tasks, submissions, performance chart, and region map.

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkers } from '@/services/profileService';
import { fetchTasks } from '@/services/taskService';
import { fetchSubmissions } from '@/services/submissionService';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { CivicMap } from '@/components/CivicMap';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import {
  ArrowLeft, MapPin, Star, Phone, Mail, Calendar, CheckCircle2,
  Clock, AlertTriangle, Loader2, FileText, Image, TrendingUp, User,
  Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as ReTooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

// ── Custom chart tooltip ─────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container border border-white/10 px-4 py-3 text-xs shadow-2xl rounded-xl">
      {label && <p className="font-bold text-slate-200 mb-2 font-headline">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-2 font-body text-sm mb-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-black font-mono ml-auto">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function WorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
  });

  const worker = workers.find(w => w.id === id);
  const workerTasks = tasks.filter(t => t.assigned_to === id);
  const workerSubs  = submissions.filter(s => s.user_id === id);

  // ── 14-day activity timeline ─────────────────────────────────────────
  const activityTimeline = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    const dayStart = startOfDay(day);
    const submitted = workerSubs.filter(s => isSameDay(new Date(s.created_at), dayStart)).length;
    const approved  = workerSubs.filter(
      s => s.status === 'approved' && isSameDay(new Date(s.reviewed_at ?? s.created_at), dayStart),
    ).length;
    return { date: format(day, 'MMM d'), submitted, approved };
  });

  // ── Derived stats ─────────────────────────────────────────────────────
  const totalTasks    = workerTasks.length;
  const completedTasks = workerTasks.filter(t => t.status === 'completed').length;
  const pendingTasks  = workerTasks.filter(t => ['pending', 'assigned', 'in_progress'].includes(t.status)).length;
  const approvalRate  = workerSubs.length
    ? Math.round((workerSubs.filter(s => s.status === 'approved').length / workerSubs.length) * 100)
    : 0;

  const scoreColor = (score: number) =>
    score >= 8 ? 'text-primary' : score >= 6 ? 'text-[#ffb596]' : 'text-error';

  // ── Loading / not-found states ────────────────────────────────────────
  if (workersLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-headline animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" /> Initializing Dossier...
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500 font-body">
        <span className="material-symbols-outlined text-5xl text-error opacity-80">error</span>
        <p className="font-bold text-slate-300">Operative Record Not Authorized or Missing.</p>
        <button 
          className="bg-surface-container border border-white/10 hover:bg-white/5 py-2 px-4 rounded-lg text-slate-300 font-bold transition-all mt-2" 
          onClick={() => navigate('/admin/workers')}
        >
          Return to Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate('/admin/workers')}
          className="mt-1 h-10 w-10 flex items-center justify-center rounded-xl bg-surface-container border border-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-4 w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-black text-slate-100 tracking-tight font-headline">{worker.full_name}</h1>
              <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border tracking-widest ${worker.is_active ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-outline/10 text-outline border-outline/20'}`}>
                {worker.is_active ? 'Active Status' : 'Offline'}
              </span>
            </div>
            <button
               onClick={() => navigate(`/admin/tasks/new?worker_id=${worker.id}`)}
               className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-glow-primary ml-auto"
            >
              <span className="material-symbols-outlined text-[18px]">assignment_add</span>
              Assign Operation
            </button>
          </div>
          <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-2 font-mono">
            ID: <span className="text-slate-400">{worker.id.substring(0, 8).toUpperCase()}</span>
          </p>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Left col: profile + stats + chart + tasks ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Operations',  value: totalTasks,    color: 'text-primary',     bg: 'bg-primary/10', icon: 'list_alt' },
              { label: 'Cleared',    value: completedTasks, color: 'text-secondary',   bg: 'bg-secondary/10', icon: 'check_circle' },
              { label: 'Active/Pending',      value: pendingTasks,   color: 'text-[#ffb596]',   bg: 'bg-[#ffb596]/10', icon: 'pending_actions' },
              { label: 'Approval Rate',value: `${approvalRate}%`, color: 'text-tertiary', bg: 'bg-tertiary/10', icon: 'trending_up' },
            ].map(({ label, value, color, bg, icon }) => (
              <div key={label} className="bg-surface-container border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 blur-xl group-hover:scale-150 transition-transform duration-700" style={{ backgroundColor: 'currentColor' }} />
                <span className={`material-symbols-outlined absolute top-4 right-4 text-[24px] opacity-20 ${color}`}>{icon}</span>
                <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-2">{label}</p>
              </div>
            ))}
          </div>

          {/* 14-day activity chart */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col mb-6 pb-4 border-b border-white/5">
              <h2 className="text-lg font-bold text-slate-200 font-headline flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">monitoring</span> Vector Analysis
              </h2>
              <p className="text-sm text-outline mt-1 font-body">Submissions vs Approvals over a 14-day trailing period.</p>
            </div>
            
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTimeline} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#90abff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#90abff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b94ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b94ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="submitted" stroke="#90abff" strokeWidth={2} fill="url(#gradSub)"      name="Submitted" dot={false} />
                  <Area type="monotone" dataKey="approved"  stroke="#8b94ff"  strokeWidth={2} fill="url(#gradApproved)" name="Approved"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
              {[
                { color: '#90abff', label: 'Submitted Proofs' },
                { color: '#8b94ff',  label: 'Verified Approvals' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block shadow-sm" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Assigned tasks */}
          <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-white/5 flex items-center gap-2 bg-surface-container-low">
              <span className="material-symbols-outlined text-primary">assignment</span>
              <h2 className="text-lg font-bold text-slate-200 font-headline">
                Active Assignments
              </h2>
              <span className="ml-auto bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">{totalTasks} Total</span>
            </div>
            {workerTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-outline">
                <span className="material-symbols-outlined text-6xl opacity-20">assignment_turned_in</span>
                <p className="text-sm font-bold tracking-wide">No Active Operations</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {workerTasks.map(task => (
                  <div
                    key={task.id}
                    className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                    onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-slate-200 group-hover:text-primary transition-colors truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {task.location_name && (
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-widest bg-[#131b2e] px-2 py-0.5 rounded">
                            <MapPin className="w-3 h-3 text-primary" />{task.location_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded ${task.priority === 'critical' ? 'bg-error/10 text-error' : task.priority === 'high' ? 'bg-[#ffb596]/10 text-[#ffb596]' : 'text-primary'}`}>
                        {task.priority}
                      </span>
                      <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded border border-white/5 bg-[#131b2e] text-slate-300`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission history */}
          <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-white/5 flex items-center gap-2 bg-surface-container-low">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="text-lg font-bold text-slate-200 font-headline">
                Operation Logs
              </h2>
              <span className="ml-auto bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">{workerSubs.length} Logs</span>
            </div>
            {workerSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-outline">
                <span className="material-symbols-outlined text-6xl opacity-20">subject</span>
                <p className="text-sm font-bold tracking-wide">No Deployment Logs Found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {workerSubs.slice(0, 10).map(sub => {
                  const task = tasks.find(t => t.id === sub.task_id);
                  const isApproved = sub.status === 'approved';
                  const isRejected = sub.status === 'rejected';
                  return (
                    <div key={sub.id} className="px-6 py-5 flex items-start gap-5">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-[#131b2e] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-md">
                        {sub.image_url ? (
                          <a href={sub.image_url} target="_blank" rel="noopener noreferrer">
                            <img src={sub.image_url} alt="Proof" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                          </a>
                        ) : (
                          <span className="material-symbols-outlined text-outline">image</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-base font-bold text-slate-200 truncate font-headline hover:text-primary cursor-pointer transition-colors"
                           onClick={() => navigate(`/admin/tasks/${sub.task_id}`)}>
                          {task?.title ?? 'Unknown Operation'}
                        </p>
                        {sub.notes ? (
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2 leading-relaxed">{sub.notes}</p>
                        ) : (
                          <p className="text-[11px] text-outline mt-1 uppercase tracking-widest font-bold italic">No field notes provided</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 flex-wrap bg-[#131b2e] px-3 py-1.5 rounded-lg border border-white/5 inline-flex">
                          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider">
                            <span className="material-symbols-outlined text-[14px]">schedule</span>
                            {format(new Date(sub.created_at), 'MMM d, yy · HH:mm')}
                          </span>
                          {sub.latitude && (
                            <span className="text-[10px] uppercase font-bold text-primary flex items-center gap-1.5 tracking-wider">
                              <span className="material-symbols-outlined text-[14px]">my_location</span>
                              {sub.latitude.toFixed(4)}, {sub.longitude?.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status chip */}
                      <span className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                        isApproved
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : isRejected
                          ? 'bg-error/10 text-error border-error/20'
                          : 'bg-[#ffb596]/10 text-[#ffb596] border-[#ffb596]/20'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                           {isApproved ? 'verified' : isRejected ? 'block' : 'pending'}
                        </span>
                        {sub.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right col: profile card + map ─── */}
        <div className="space-y-6">

          {/* Profile card */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#131b2e] to-surface-container z-0" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Dossier</span>
                <span className="material-symbols-outlined text-primary">badge</span>
              </div>

              {/* Avatar */}
              <div className="flex flex-col items-center text-center gap-3 py-4 mt-2">
                <div className="w-20 h-20 rounded-full bg-[#0b1326] border-2 border-primary/30 flex items-center justify-center shadow-[0_0_20px_rgba(144,171,255,0.15)]">
                  <span className="text-3xl font-black text-primary font-headline">
                    {worker.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-100 text-xl font-headline tracking-tight">{worker.full_name}</p>
                  <p className="text-[11px] font-bold text-primary uppercase tracking-widest mt-1">Field Operative</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-4 pt-4 border-t border-white/5 mt-4">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded bg-[#131b2e] border border-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">mail</span>
                  </div>
                  <span className="text-slate-200 font-medium truncate">{worker.email}</span>
                </div>
                {worker.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded bg-[#131b2e] border border-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">call</span>
                    </div>
                    <span className="text-slate-200 font-medium">{worker.phone}</span>
                  </div>
                )}
                {worker.region && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded bg-[#131b2e] border border-white/5 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-primary">my_location</span>
                    </div>
                    <span className="text-slate-200 font-medium">{worker.region}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded bg-[#131b2e] border border-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[16px] text-slate-400">event</span>
                  </div>
                  <span className="text-slate-200 font-medium">
                    Auth: <span className="text-slate-400 ml-1">{format(new Date(worker.created_at), 'MMM d, yyyy')}</span>
                  </span>
                </div>
              </div>
            </div>
            
            {/* Performance score */}
            <div className="pt-6 mt-6 border-t border-white/5 relative z-10">
              <div className="flex items-end justify-between mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-outline">
                  <span className="material-symbols-outlined text-[14px]">psychiatry</span> AI Rank
                </span>
                <div className="text-right">
                  <span className={`text-3xl font-black font-mono tracking-tighter ${scoreColor(worker.performance_score ?? 7.5)} leading-none`}>
                    {(worker.performance_score ?? 7.5).toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-[#131b2e] rounded-full h-1.5 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(144,171,255,0.5)]"
                  style={{ width: `${((worker.performance_score ?? 7.5) / 10) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Region map — show worker location + assigned tasks */}
          <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-surface-container-low">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-primary">satellite_alt</span>
                Last Known Vector
              </span>
            </div>
            {(worker.latitude && worker.longitude) ? (
              <div className="relative">
                <CivicMap
                  tasks={workerTasks}
                  workers={[worker]}
                  className="w-full h-[280px]"
                />
                <div className="absolute top-2 left-2 bg-[#0b1326]/80 backdrop-blur border border-white/10 px-2 py-1 rounded text-[9px] font-bold tracking-widest uppercase text-primary font-mono select-none pointer-events-none">
                  GPS: {worker.latitude.toFixed(4)}, {worker.longitude.toFixed(4)}
                </div>
              </div>
            ) : (
              <div className="h-[280px] bg-[#0b1326] flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-5xl text-outline mb-3 opacity-20">location_disabled</span>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Telemetry Offline</p>
                <p className="text-[10px] text-outline mt-1 font-mono">No GPS coordinates available.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
