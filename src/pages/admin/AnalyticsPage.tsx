// Analytics page — live charts: completion rate, worker performance, category distribution, regional coverage

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubmissions, reviewSubmission } from '@/services/submissionService';
import { fetchWorkers } from '@/services/profileService';
import { fetchTasks, fetchTaskStats } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import { subDays, format, startOfDay, isSameDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart,
} from 'recharts';
import { CheckCircle2, XCircle, Image, MapPin, TrendingUp, Users, ClipboardList, Activity } from 'lucide-react';
import { toast } from 'sonner';

// ── Shared tooltip ───────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-xs shadow-card border border-border">
      {label && <p className="font-medium text-foreground mb-1">{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Pie label ────────────────────────────────────────────────────────────
const PieLabel = ({ cx, cy, midAngle, outerRadius, value, name }: any) => {
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (!value) return null;
  return (
    <text x={x} y={y} fill="hsl(215 15% 55%)" fontSize={10} textAnchor={x > cx ? 'start' : 'end'}>
      {name} ({value})
    </text>
  );
};

const CATEGORY_COLORS = [
  'hsl(211 100% 50%)',
  'hsl(160 75% 46%)',
  'hsl(38 92% 50%)',
  'hsl(280 70% 60%)',
  'hsl(340 80% 60%)',
  'hsl(195 80% 50%)',
  'hsl(24 90% 55%)',
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
      toast.success(status === 'approved' ? 'Submission approved!' : 'Submission rejected');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Live insights from database — refreshes every 15s</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-up delay-100">
        {[
          { label: 'Total Tasks',       value: stats?.total ?? '—',      icon: ClipboardList, color: 'text-primary',   bg: 'bg-primary/10' },
          { label: 'Completed',         value: stats?.completed ?? '—',  icon: CheckCircle2,  color: 'text-secondary', bg: 'bg-secondary/10' },
          { label: 'Approval Rate',     value: `${approvalRate}%`,        icon: TrendingUp,    color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Avg Worker Score',  value: avgScore,                  icon: Users,         color: 'text-violet-400',bg: 'bg-violet-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card-surface p-4 shadow-card flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground font-mono-data">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Completion timeline ─────────────────────────────────── */}
      <div className="card-surface p-5 shadow-card animate-fade-up delay-200">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Task Activity — Last 14 Days</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">Tasks created vs completed vs submissions approved</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={completionTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(211 100% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(211 100% 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(160 75% 46%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(160 75% 46%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(215 15% 30%)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="created"   stroke="hsl(211 100% 50%)" strokeWidth={2} fill="url(#gradCreated)"   name="Created"   dot={false} />
            <Area type="monotone" dataKey="completed" stroke="hsl(160 75% 46%)"  strokeWidth={2} fill="url(#gradCompleted)" name="Completed" dot={false} />
            <Area type="monotone" dataKey="approved"  stroke="hsl(38 92% 50%)"   strokeWidth={2} fill="url(#gradApproved)"  name="Approved"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          {[
            { color: 'hsl(211 100% 50%)', label: 'Created' },
            { color: 'hsl(160 75% 46%)',  label: 'Completed' },
            { color: 'hsl(38 92% 50%)',   label: 'Approved' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 2: Worker performance + Category pie ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-up delay-300">

        {/* Worker performance */}
        <div className="card-surface p-5 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-semibold text-foreground">Worker Performance</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Submissions approved vs total (top 8)</p>
          {workers.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">No worker data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workerPerf} barGap={2} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(220 22% 15% / 0.5)' }} />
                <Bar dataKey="submitted" fill="hsl(220 18% 28%)" radius={[3, 3, 0, 0]} name="Submitted" />
                <Bar dataKey="approved"  fill="hsl(160 75% 46%)" radius={[3, 3, 0, 0]} name="Approved"  />
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Score leaderboard */}
          {workerPerf.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Performance Scores</p>
              {workerPerf.slice(0, 5).map((w, i) => (
                <div key={w.name} className="flex items-center gap-2">
                  <span className="text-xs font-mono-data text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-xs text-foreground flex-1 truncate">{w.fullName}</span>
                  <div className="w-24 bg-surface-3 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full score-gradient"
                      style={{ width: `${(w.score / 10) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono-data text-primary w-8 text-right">{w.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category pie chart */}
        <div className="card-surface p-5 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Tasks by Category</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Distribution across all task categories</p>
          {categoryData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-xs">No tasks yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
                {categoryData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    {item.name}
                    <span className="font-mono-data text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Regional coverage ───────────────────────────────────── */}
      {regionalData.length > 0 && (
        <div className="card-surface p-5 shadow-card animate-fade-up delay-400">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Regional Coverage</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Tasks and worker distribution by region</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={regionalData} barGap={2} barCategoryGap="30%" margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
              <XAxis dataKey="region" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'hsl(220 22% 15% / 0.5)' }} />
              <Bar dataKey="total"     fill="hsl(211 100% 50% / 0.5)" radius={[3, 3, 0, 0]} name="Total Tasks"   />
              <Bar dataKey="completed" fill="hsl(160 75% 46%)"         radius={[3, 3, 0, 0]} name="Completed"    />
              <Bar dataKey="workers"   fill="hsl(38 92% 50%)"          radius={[3, 3, 0, 0]} name="Workers"      />
            </BarChart>
          </ResponsiveContainer>
          {/* Coverage health */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {regionalData.slice(0, 4).map(r => {
              const rate = r.total ? Math.round((r.completed / r.total) * 100) : 0;
              return (
                <div key={r.region} className="bg-surface-2 rounded-xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground truncate">{r.region}</p>
                  <p className="text-lg font-bold text-foreground font-mono-data">{rate}%</p>
                  <div className="mt-1.5 bg-surface-3 rounded-full h-1">
                    <div
                      className="h-1 rounded-full transition-all duration-700"
                      style={{
                        width: `${rate}%`,
                        background: rate >= 75 ? 'hsl(160 75% 46%)' : rate >= 40 ? 'hsl(38 92% 50%)' : 'hsl(0 75% 55%)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.workers} workers</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Submission Review Queue ────────────────────────────────────── */}
      <div className="card-surface shadow-card animate-fade-up delay-500">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Submission Review Queue
              {pendingReview.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                  {pendingReview.length}
                </span>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">{pendingReview.length} awaiting review</p>
          </div>
        </div>

        {subsLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="shimmer w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-3 rounded w-1/3" />
                  <div className="shimmer h-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium text-sm">No submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Worker submissions will appear here for review</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {submissions.slice(0, 10).map(sub => {
              const worker = workerMap[sub.user_id];
              return (
                <div key={sub.id} className="px-5 py-4 flex items-start gap-4 hover:bg-surface-2/30 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {sub.image_url ? (
                      <img src={sub.image_url} alt="Proof" className="w-full h-full object-cover" />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{(worker?.full_name ?? '?').charAt(0)}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{worker?.full_name ?? 'Unknown Worker'}</span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border badge-pending scale-90">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Pending
                      </span>
                    </div>
                    {sub.notes && <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{sub.notes}</p>}
                    {sub.latitude && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {sub.latitude.toFixed(4)}, {sub.longitude?.toFixed(4)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(sub.created_at).toLocaleString()}</p>
                  </div>
                  {sub.status === 'submitted' ? (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => reviewMutation.mutate({ id: sub.id, status: 'approved' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => reviewMutation.mutate({ id: sub.id, status: 'rejected' })}
                        disabled={reviewMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <StatusBadge status={sub.status === 'approved' ? 'completed' : 'cancelled' as any} />
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
