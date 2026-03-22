// Worker Detail Page — /admin/workers/:id
// Shows worker profile, assigned tasks, submissions, performance chart, and region map.

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkers } from '@/services/profileService';
import { fetchTasks } from '@/services/taskService';
import { fetchSubmissions } from '@/services/submissionService';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { CivicMap } from '@/components/CivicMap';
import { Button } from '@/components/ui/button';
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
    score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-red-400';

  // ── Loading / not-found states ────────────────────────────────────────
  if (workersLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <AlertTriangle className="w-8 h-8" />
        <p>Worker not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin/workers')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start gap-3 animate-fade-up">
        <button
          onClick={() => navigate('/admin/workers')}
          className="mt-1 p-2 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">{worker.full_name}</h1>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${worker.is_active ? 'badge-active' : 'badge-overdue'}`}>
              {worker.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Field Worker Profile</p>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Left col: profile + stats + chart + tasks ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up delay-100">
            {[
              { label: 'Total Tasks',  value: totalTasks,    color: 'text-primary',     bg: 'bg-primary/10' },
              { label: 'Completed',    value: completedTasks, color: 'text-secondary',   bg: 'bg-secondary/10' },
              { label: 'Pending',      value: pendingTasks,   color: 'text-amber-400',   bg: 'bg-amber-500/10' },
              { label: 'Approval Rate',value: `${approvalRate}%`, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="card-surface p-4 shadow-card">
                <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* 14-day activity chart */}
          <div className="card-surface p-5 shadow-card animate-fade-up delay-200">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Submission Activity — Last 14 Days</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Submissions made vs approved</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={activityTimeline} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(211 100% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(211 100% 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(160 75% 46%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(160 75% 46%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <ReTooltip content={<ChartTooltip />} cursor={{ stroke: 'hsl(215 15% 30%)', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="submitted" stroke="hsl(211 100% 50%)" strokeWidth={2} fill="url(#gradSub)"      name="Submitted" dot={false} />
                <Area type="monotone" dataKey="approved"  stroke="hsl(160 75% 46%)"  strokeWidth={2} fill="url(#gradApproved)" name="Approved"  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {[
                { color: 'hsl(211 100% 50%)', label: 'Submitted' },
                { color: 'hsl(160 75% 46%)',  label: 'Approved' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Assigned tasks */}
          <div className="card-surface shadow-card animate-fade-up delay-300">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Assigned Tasks
                <span className="ml-2 text-xs font-normal text-muted-foreground">({totalTasks})</span>
              </h2>
            </div>
            {workerTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-sm">No tasks assigned yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workerTasks.map(task => (
                  <div
                    key={task.id}
                    className="px-5 py-3.5 flex items-center gap-3 hover:bg-surface-2/30 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {task.location_name && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />{task.location_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={task.priority as any} />
                      <StatusBadge status={task.status as any} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submission history */}
          <div className="card-surface shadow-card animate-fade-up delay-400">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2">
              <Image className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">
                Submission History
                <span className="ml-2 text-xs font-normal text-muted-foreground">({workerSubs.length})</span>
              </h2>
            </div>
            {workerSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <Image className="w-8 h-8 opacity-30" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {workerSubs.slice(0, 10).map(sub => {
                  const task = tasks.find(t => t.id === sub.task_id);
                  const isApproved = sub.status === 'approved';
                  const isRejected = sub.status === 'rejected';
                  return (
                    <div key={sub.id} className="px-5 py-4 flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {sub.image_url ? (
                          <a href={sub.image_url} target="_blank" rel="noopener noreferrer">
                            <img src={sub.image_url} alt="Proof" className="w-full h-full object-cover" />
                          </a>
                        ) : (
                          <Image className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {task?.title ?? 'Unknown Task'}
                        </p>
                        {sub.notes && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{sub.notes}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(sub.created_at), 'MMM d, yyyy · HH:mm')}
                          </span>
                          {sub.latitude && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {sub.latitude.toFixed(4)}, {sub.longitude?.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status chip */}
                      <span className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                        isApproved
                          ? 'bg-secondary/10 text-secondary border-secondary/20'
                          : isRejected
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {isApproved
                          ? <><CheckCircle2 className="w-3 h-3" /> Approved</>
                          : isRejected
                          ? <><AlertTriangle className="w-3 h-3" /> Rejected</>
                          : <><Clock className="w-3 h-3" /> Pending</>
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right col: profile card + map ─── */}
        <div className="space-y-4">

          {/* Profile card */}
          <div className="card-surface p-5 shadow-card space-y-4 animate-fade-up delay-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-16 h-16 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {worker.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-foreground">{worker.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">Field Worker</p>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-2.5 text-xs">
                <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground truncate">{worker.email}</span>
              </div>
              {worker.phone && (
                <div className="flex items-center gap-2.5 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{worker.phone}</span>
                </div>
              )}
              {worker.region && (
                <div className="flex items-center gap-2.5 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{worker.region}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  Joined {format(new Date(worker.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Performance score */}
            <div className="pt-3 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="w-3.5 h-3.5" /> Performance Score
                </span>
                <span className={`text-lg font-bold font-mono ${scoreColor(worker.performance_score ?? 7.5)}`}>
                  {(worker.performance_score ?? 7.5).toFixed(1)}<span className="text-xs text-muted-foreground font-normal">/10</span>
                </span>
              </div>
              <div className="w-full bg-surface-3 rounded-full h-2">
                <div
                  className="h-2 rounded-full score-gradient transition-all duration-700"
                  style={{ width: `${((worker.performance_score ?? 7.5) / 10) * 100}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Submitted', value: workerSubs.length },
                  { label: 'Approved',  value: workerSubs.filter(s => s.status === 'approved').length },
                  { label: 'Rate',      value: `${approvalRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface-2 rounded-lg p-2 text-center border border-border">
                    <p className="text-sm font-bold text-foreground font-mono">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Region map — show worker location + assigned tasks */}
          {(worker.latitude && worker.longitude) ? (
            <div className="card-surface shadow-card overflow-hidden animate-fade-up delay-200">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Worker Location</span>
              </div>
              <CivicMap
                tasks={workerTasks}
                workers={[worker]}
                className="w-full h-[240px]"
              />
            </div>
          ) : (
            <div className="card-surface p-5 shadow-card text-center animate-fade-up delay-200">
              <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-30" />
              <p className="text-xs text-muted-foreground">No GPS location set for this worker</p>
            </div>
          )}

          {/* Trend insights */}
          <div className="card-surface p-5 shadow-card space-y-3 animate-fade-up delay-300">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Performance Insights</h2>
            </div>
            {[
              { label: 'Task Completion',  value: totalTasks ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '—', color: 'text-secondary' },
              { label: 'Approval Rate',    value: `${approvalRate}%`,                                                        color: approvalRate >= 70 ? 'text-secondary' : 'text-amber-400' },
              { label: 'Total Submissions', value: workerSubs.length,                                                       color: 'text-primary' },
              { label: 'Active Tasks',     value: pendingTasks,                                                              color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
