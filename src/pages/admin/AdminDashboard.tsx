// Admin Dashboard — KPI cards, task stats, worker leaderboard, activity table

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTaskStats } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { fetchSubmissions } from '@/services/submissionService';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, CheckCircle2, MapPin, Star,
  ClipboardList, TrendingUp, Clock, Zap,
  ChevronRight, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import type { Database } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';

type Task = Database['public']['Tables']['tasks']['Row'];

// Mock weekly completion data (in real app, aggregate from DB)
const weeklyData = [
  { day: 'Mon', completed: 8,  assigned: 12 },
  { day: 'Tue', completed: 14, assigned: 18 },
  { day: 'Wed', completed: 11, assigned: 15 },
  { day: 'Thu', completed: 19, assigned: 22 },
  { day: 'Fri', completed: 16, assigned: 20 },
  { day: 'Sat', completed: 7,  assigned: 9  },
  { day: 'Sun', completed: 5,  assigned: 7  },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['taskStats'],
    queryFn: fetchTaskStats,
    refetchInterval: 30_000,
  });

  const { data: workers = [], isLoading: workersLoading } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  // Recent tasks
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setRecentTasks(data ?? []));
  }, []);

  // Build worker profiles map for assignee names
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

  const topWorkers = [...workers].sort((a, b) => b.performance_score - a.performance_score).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/tasks/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all shadow-glow-primary"
        >
          <Zap className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Workers"
          value={workersLoading ? '—' : workers.length}
          subtitle={`${workers.filter(w => w.is_active).length} active`}
          icon={Users}
          trend={12}
          accentColor="primary"
          animationDelay={0}
          loading={workersLoading}
        />
        <KpiCard
          title="Completed Today"
          value={statsLoading ? '—' : stats?.completedToday ?? 0}
          subtitle={`of ${stats?.total ?? 0} total tasks`}
          icon={CheckCircle2}
          trend={8}
          accentColor="secondary"
          animationDelay={100}
          loading={statsLoading}
        />
        <KpiCard
          title="In Progress"
          value={statsLoading ? '—' : stats?.inProgress ?? 0}
          subtitle="Active field tasks"
          icon={Clock}
          accentColor="accent"
          animationDelay={200}
          loading={statsLoading}
        />
        <KpiCard
          title="Pending Assignment"
          value={statsLoading ? '—' : stats?.pending ?? 0}
          subtitle="Needs assignment"
          icon={ClipboardList}
          trend={-3}
          accentColor="destructive"
          animationDelay={300}
          loading={statsLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly task completion chart */}
        <div className="lg:col-span-2 card-surface p-5 shadow-card animate-fade-up delay-400">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Task Completion</h2>
              <p className="text-xs text-muted-foreground">This week</p>
            </div>
            <TrendingUp className="w-4 h-4 text-secondary" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220 22% 15% / 0.5)' }} />
              <Bar dataKey="assigned"  fill="hsl(220 18% 22%)" radius={[4, 4, 0, 0]} name="Assigned" />
              <Bar dataKey="completed" fill="hsl(211 100% 50%)" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Worker leaderboard */}
        <div className="card-surface p-5 shadow-card animate-fade-up delay-500">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Top Workers</h2>
              <p className="text-xs text-muted-foreground">By performance score</p>
            </div>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="space-y-3">
            {workersLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="shimmer w-7 h-7 rounded-full" />
                    <div className="flex-1 shimmer h-3 rounded" />
                    <div className="shimmer h-3 w-8 rounded" />
                  </div>
                ))
              : topWorkers.map((w, i) => (
                  <div key={w.id} className="flex items-center gap-3">
                    {/* Rank */}
                    <span className="w-5 text-xs font-mono-data text-muted-foreground text-center">
                      {i + 1}
                    </span>
                    {/* Avatar */}
                    <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {w.full_name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{w.full_name}</p>
                      <div className="w-full bg-surface-3 rounded-full h-1 mt-1">
                        <div
                          className="h-1 rounded-full score-gradient transition-all"
                          style={{ width: `${(w.performance_score / 10) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono-data text-foreground tabular-nums">
                      {w.performance_score.toFixed(1)}
                    </span>
                  </div>
                ))
            }
          </div>
          <button
            onClick={() => navigate('/admin/workers')}
            className="w-full mt-4 flex items-center justify-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-1.5"
          >
            View all workers <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Recent tasks table */}
      <div className="card-surface shadow-card animate-fade-up delay-600">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Tasks</h2>
            <p className="text-xs text-muted-foreground">Latest assignments and updates</p>
          </div>
          <button
            onClick={() => navigate('/admin/tasks')}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View all <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {['Task', 'Priority', 'Status', 'Assigned To', 'Location', 'Created'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No tasks yet. <button onClick={() => navigate('/admin/tasks/new')} className="text-primary hover:underline">Create the first task →</button>
                  </td>
                </tr>
              ) : (
                recentTasks.map(task => (
                  <tr
                    key={task.id}
                    className="hover:bg-surface-2/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/tasks/${task.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{task.title}</p>
                        {task.category && (
                          <p className="text-xs text-muted-foreground capitalize">{task.category}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high' | 'critical'} />
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={task.status as 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'} />
                    </td>
                    <td className="px-5 py-3.5">
                      {task.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary">
                              {(workerMap[task.assigned_to]?.full_name ?? '?').charAt(0)}
                            </span>
                          </div>
                          <span className="text-xs text-foreground">
                            {workerMap[task.assigned_to]?.full_name ?? 'Unknown'}
                          </span>
                          {task.ai_assigned && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">AI</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{task.location_name ?? `${task.latitude.toFixed(2)}, ${task.longitude.toFixed(2)}`}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(task.created_at).toLocaleDateString()}
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
