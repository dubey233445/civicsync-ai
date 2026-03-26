// Analytics page — live charts: completion rate, worker performance, category distribution, regional coverage

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubmissions, reviewSubmission } from '@/services/submissionService';
import { fetchWorkers } from '@/services/profileService';
import { fetchTasks, fetchTaskStats } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, startOfDay, isSameDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Area, AreaChart,
} from 'recharts';
import { CheckCircle2, XCircle, Image, MapPin, TrendingUp, Users, ClipboardList, Activity, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Shared tooltip ───────────────────────────────────────────────────────
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

const CATEGORY_COLORS = [
  '#90abff', // primary
  '#8b94ff', // secondary
  '#ffb4f4', // tertiary
  '#ffb596', // amber/orange equivalent
  '#4edea3', // emerald equivalent
  '#d7383b', // error/red 
  '#fe9cf4', // tertiary-container
];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['submissions'],
    queryFn: fetchSubmissions,
    refetchInterval: 15_000,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['taskStats'],
    queryFn: fetchTaskStats,
  });

  const workerMap = useMemo(
    () => Object.fromEntries(workers.map(w => [w.id, w])),
    [workers],
  );

  // ── 1. Task completion rate over the last 14 days ────────────────────
  const completionTimeline = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => subDays(new Date(), 13 - i));
    return days.map(day => {
      const dayStart = startOfDay(day);
      const created   = tasks.filter(t => isSameDay(new Date(t.created_at), dayStart)).length;
      const completed = tasks.filter(
        t => t.status === 'completed' && isSameDay(new Date(t.updated_at), dayStart),
      ).length;
      const approved  = submissions.filter(
        s => s.status === 'approved' && isSameDay(new Date(s.reviewed_at ?? s.created_at), dayStart),
      ).length;
      return { date: format(day, 'MMM d'), created, completed, approved };
    });
  }, [tasks, submissions]);

  // ── 2. Worker performance bar chart ──────────────────────────────────
  const workerPerf = useMemo(() =>
    workers
      .filter(w => w.role === 'worker')
      .map(w => {
        const wsubs = submissions.filter(s => s.user_id === w.id);
        return {
          name:      w.full_name.split(' ')[0],
          fullName:  w.full_name,
          submitted: wsubs.length,
          approved:  wsubs.filter(s => s.status === 'approved').length,
          score:     Number(w.performance_score?.toFixed(1) ?? 0),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8),
    [workers, submissions],
  );

  // ── 3. Tasks per category pie chart ──────────────────────────────────
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      const cat = t.category ?? 'general';
      counts[cat] = (counts[cat] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [tasks]);

  // ── 4. Regional coverage bar ──────────────────────────────────────────
  const regionalData = useMemo(() => {
    const regions: Record<string, { total: number; completed: number; workers: number }> = {};
    tasks.forEach(t => {
      const r = t.region ?? 'Unspecified';
      if (!regions[r]) regions[r] = { total: 0, completed: 0, workers: 0 };
      regions[r].total++;
      if (t.status === 'completed') regions[r].completed++;
    });
    workers.forEach(w => {
      const r = w.region ?? 'Unspecified';
      if (!regions[r]) regions[r] = { total: 0, completed: 0, workers: 0 };
      regions[r].workers++;
    });
    return Object.entries(regions)
      .map(([region, data]) => ({ region, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [tasks, workers]);

  // ── Review mutation ───────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) =>
      reviewSubmission(id, status, profile!.id),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'Log cleared ✓' : 'Log rejected');
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['workers'] });
      qc.invalidateQueries({ queryKey: ['taskStats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendingReview = submissions.filter(s => s.status === 'submitted');

  // ── Summary KPIs ──────────────────────────────────────────────────────
  const approvalRate = submissions.length
    ? Math.round((submissions.filter(s => s.status === 'approved').length / submissions.length) * 100)
    : 0;

  const avgScore = workers.length
    ? (workers.reduce((s, w) => s + (w.performance_score ?? 0), 0) / workers.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100 font-headline tracking-tight">Global Analytics</h1>
        <p className="font-body text-sm text-on-surface-variant mt-1 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Live telemetry from operational database
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Operations',       value: stats?.total ?? '—',      icon: 'data_usage', color: 'text-primary' },
          { label: 'Cleared Objectives',         value: stats?.completed ?? '—',  icon: 'task_alt',  color: 'text-secondary' },
          { label: 'Clearance Rate',     value: `${approvalRate}%`,        icon: 'trending_up',    color: 'text-[#ffb596]' },
          { label: 'Avg AI Matrix Score',  value: avgScore,                  icon: 'groups',         color: 'text-tertiary' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-surface-container border border-white/5 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-10 blur-xl group-hover:scale-150 transition-transform duration-700`} style={{ backgroundColor: 'currentColor' }} />
            <span className={`material-symbols-outlined absolute top-4 right-4 text-[24px] opacity-20 ${color}`}>{icon}</span>
            <p className={`text-3xl font-black font-mono tracking-tighter ${color}`}>{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-2">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Row 1: Completion timeline ─────────────────────────────────── */}
      <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">monitoring</span>
          <h2 className="text-lg font-bold text-slate-200 font-headline">Operational Velocity</h2>
        </div>
        <p className="text-sm text-outline font-body mb-6">Operations initialized vs cleared vs proofs approved over 14 days.</p>
        
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={completionTimeline} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#90abff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#90abff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b94ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b94ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ffb4f4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ffb4f4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="created"   stroke="#90abff" strokeWidth={2} fill="url(#gradCreated)"   name="Initialized"   dot={false} />
              <Area type="monotone" dataKey="completed" stroke="#8b94ff"  strokeWidth={2} fill="url(#gradCompleted)" name="Cleared" dot={false} />
              <Area type="monotone" dataKey="approved"  stroke="#ffb4f4"   strokeWidth={2} fill="url(#gradApproved)"  name="Proofs Approved"  dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {[
            { color: '#90abff', label: 'Initialized' },
            { color: '#8b94ff',  label: 'Cleared' },
            { color: '#ffb4f4',   label: 'Proofs Approved' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block shadow-sm" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 2: Worker performance + Category pie ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Worker performance */}
        <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-secondary">groups</span>
            <h2 className="text-lg font-bold text-slate-200 font-headline">Operative Efficiency Matrix</h2>
          </div>
          <p className="text-sm text-outline font-body mb-6">Submitted vs Approved proofs for top ranked personnel.</p>
          
          {workers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-outline opacity-50">
              <span className="material-symbols-outlined text-5xl mb-2">group_off</span>
              <p className="text-xs uppercase tracking-widest font-bold">No telemetry data</p>
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workerPerf} barGap={2} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                  <Bar dataKey="submitted" fill="#1f2b49" radius={[4, 4, 0, 0]} name="Submitted" />
                  <Bar dataKey="approved"  fill="#8b94ff" radius={[4, 4, 0, 0]} name="Approved"  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Score leaderboard */}
          {workerPerf.length > 0 && (
            <div className="mt-6 space-y-3 pt-4 border-t border-white/5">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">Top Performers Matrix Rank</p>
              {workerPerf.slice(0, 4).map((w, i) => (
                <div key={w.name} className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-500 w-4 font-mono">{i + 1}</span>
                  <span className="text-sm font-bold text-slate-200 flex-1 truncate">{w.fullName}</span>
                  <div className="w-24 bg-[#131b2e] rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-primary transition-all duration-1000"
                      style={{ width: `${(w.score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-black font-mono text-primary w-8 text-right">{w.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category pie chart */}
        <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-tertiary">pie_chart</span>
            <h2 className="text-lg font-bold text-slate-200 font-headline">Vector Distribution</h2>
          </div>
          <p className="text-sm text-outline font-body mb-6">Categorical distribution of all operations.</p>
          
          {categoryData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-outline opacity-50">
              <span className="material-symbols-outlined text-5xl mb-2">analytics</span>
              <p className="text-xs uppercase tracking-widest font-bold">No vector data</p>
            </div>
          ) : (
            <>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      labelLine={false}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="rgba(6,13,32,0.5)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-6 justify-center pt-4 border-t border-white/5">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                    <span className="w-3 h-3 rounded-full inline-block shadow-sm" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-black font-mono text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Regional coverage ───────────────────────────────────── */}
      {regionalData.length > 0 && (
        <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#ffb596]">public</span>
            <h2 className="text-lg font-bold text-slate-200 font-headline">Global Deployment Overview</h2>
          </div>
          <p className="text-sm text-outline font-body mb-6">Operations and personnel density by zone.</p>
          
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionalData} barGap={4} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="region" tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6d758c', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                <Bar dataKey="total"     fill="rgba(144,171,255,0.3)" radius={[4, 4, 0, 0]} name="Total Ops"   />
                <Bar dataKey="completed" fill="#8b94ff"             radius={[4, 4, 0, 0]} name="Cleared"    />
                <Bar dataKey="workers"   fill="#ffb596"              radius={[4, 4, 0, 0]} name="Personnel"      />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Coverage health */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            {regionalData.slice(0, 4).map(r => {
              const rate = r.total ? Math.round((r.completed / r.total) * 100) : 0;
              return (
                <div key={r.region} className="bg-[#131b2e] rounded-xl p-4 border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate mb-1 relative z-10">{r.region}</p>
                  <p className="text-2xl font-black text-slate-200 font-mono relative z-10">{rate}%</p>
                  <div className="mt-2 bg-surface-container rounded-full h-1.5 relative z-10 border border-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_currentColor]"
                      style={{
                        width: `${rate}%`,
                        backgroundColor: rate >= 75 ? '#4edea3' : rate >= 40 ? '#ffb596' : '#d7383b',
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-3 relative z-10">{r.workers} Assets Deployed</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Submission Review Queue ────────────────────────────────────── */}
      <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 flex items-center justify-between border-b border-white/5 bg-surface-container-low">
          <div>
            <h2 className="text-lg font-bold text-slate-200 font-headline flex items-center gap-2">
              <span className="material-symbols-outlined text-error">gavel</span> Proof Review Queue
              {pendingReview.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-error/20 text-error text-[10px] font-black font-mono ml-2 border border-error/20">
                  {pendingReview.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-outline font-body mt-1">Pending logs awaiting executive clearance.</p>
          </div>
        </div>

        {subsLoading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 rounded-xl bg-surface-container-high animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-surface-container-high animate-pulse rounded w-1/3" />
                  <div className="h-3 bg-surface-container-high animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-16 text-center text-outline opacity-50 flex flex-col items-center">
            <span className="material-symbols-outlined text-6xl mb-4">fact_check</span>
            <p className="font-bold text-sm uppercase tracking-widest">No pending reviews</p>
            <p className="text-xs mt-1">All incoming logs have been processed.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {submissions.slice(0, 10).map(sub => {
              const worker = workerMap[sub.user_id];
              return (
                <div key={sub.id} className="px-6 py-5 flex flex-wrap lg:flex-nowrap items-center gap-6 hover:bg-white/[0.02] transition-colors group">
                  <div className="w-20 h-20 rounded-xl bg-[#0b1326] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-lg relative">
                    {sub.image_url ? (
                      <>
                        <img src={sub.image_url} alt="Proof" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />
                      </>
                    ) : (
                      <span className="material-symbols-outlined text-outline">image_not_supported</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex flex-shrink-0 items-center justify-center text-primary font-black font-headline text-sm">
                        {(worker?.full_name ?? '?').charAt(0)}
                      </div>
                      <span className="text-base font-bold text-slate-200 font-headline truncate">{worker?.full_name ?? 'Unknown Operative'}</span>
                      {sub.status === 'submitted' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-black border bg-[#ffb596]/10 text-[#ffb596] border-[#ffb596]/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffb596] animate-pulse" /> Pending
                        </span>
                      ) : (
                         <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] uppercase tracking-widest font-black border ${sub.status === 'approved' ? 'bg-secondary/10 text-secondary border-secondary/20' : 'bg-error/10 text-error border-error/20'}`}>
                           {sub.status === 'approved' ? 'Cleared' : 'Rejected'}
                         </span>
                      )}
                    </div>
                    {sub.notes && <p className="text-sm text-slate-400 mb-2 line-clamp-1 italic">"{sub.notes}"</p>}
                    <div className="flex items-center gap-4 flex-wrap bg-[#131b2e] border border-white/5 rounded-lg px-3 py-1.5 inline-flex">
                      {sub.latitude && (
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 border-r border-white/10 pr-4">
                          <span className="material-symbols-outlined text-[14px] text-primary">my_location</span>
                          {sub.latitude.toFixed(4)}, {sub.longitude?.toFixed(4)}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {format(new Date(sub.created_at), 'MMM d, yy · HH:mm:ss')}
                      </span>
                    </div>
                  </div>
                  
                  {sub.status === 'submitted' && (
                    <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                      <button
                        onClick={() => reviewMutation.mutate({ id: sub.id, status: 'approved' })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 text-[11px] font-black uppercase tracking-widest hover:bg-secondary hover:text-[#0b1326] transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">how_to_reg</span> Clear Log
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({ id: sub.id, status: 'rejected' })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#131b2e] text-error border border-error/20 text-[11px] font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span> Reject
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
