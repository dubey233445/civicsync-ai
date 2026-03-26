// Admin Dashboard — KPI cards, task stats, worker leaderboard, activity table

import { useQuery } from '@tanstack/react-query';
import { fetchTaskStats, fetchTasks } from '@/services/taskService';
import { fetchWorkers } from '@/services/profileService';
import { CivicMap } from '@/components/CivicMap';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
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

  const { data: allTasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    refetchInterval: 30_000,
  });

  // Recent tasks (latest 6)
  const recentTasks = allTasks.slice(0, 6);

  // Build worker profiles map for assignee names
  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

  const topWorkers = [...workers].sort((a, b) => (b.performance_score ?? 0) - (a.performance_score ?? 0)).slice(0, 5);

  return (
    <div className="space-y-12">
      {/* Row 1: KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest font-label">Total Workers</span>
            <div className="p-2 rounded-lg bg-primary-container/10 text-primary">
              <span className="material-symbols-outlined text-xl">group</span>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-headline">{workersLoading ? '—' : workers.length}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-secondary text-xs font-bold">{workers.filter(w => w.is_active).length} active</span>
              <span className="text-on-surface-variant/60 text-[10px]">in system</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest font-label">Completed Today</span>
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-headline">{statsLoading ? '—' : stats?.completedToday ?? 0}</h3>
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-4">
              <div className="bg-secondary h-1.5 rounded-full shadow-[0_0_8px_rgba(78,222,163,0.3)]" style={{ width: `${stats?.total ? ((stats.completedToday / stats.total) * 100) : 0}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest font-label">In Progress</span>
            <div className="p-2 rounded-lg bg-tertiary-container/10 text-tertiary">
              <span className="material-symbols-outlined text-xl">clock_loader_40</span>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-headline">{statsLoading ? '—' : stats?.inProgress ?? 0}</h3>
            <p className="text-on-surface-variant/60 text-[10px] mt-2">Active field tasks</p>
          </div>
        </div>

        <div className="bg-surface-container rounded-xl p-6 shadow-sm flex flex-col justify-between transition-transform hover:scale-[1.01]">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-widest font-label">Pending</span>
            <div className="p-2 rounded-lg bg-error-container/10 text-error">
              <span className="material-symbols-outlined text-xl">assignment_late</span>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold text-white font-headline">{statsLoading ? '—' : stats?.pending ?? 0}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-error text-xs font-bold">Needs Assignment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Geographic Heatmap */}
      <section className="bg-surface-container rounded-xl overflow-hidden relative group shadow-sm">
        <div className="absolute top-6 left-8 z-10 space-y-1">
          <h4 className="text-xl font-bold text-white font-headline">Global Coverage Heatmap</h4>
          <p className="text-xs text-on-surface-variant font-body">Real-time resource allocation density</p>
        </div>
        <div className="absolute top-6 right-8 z-10 glass-panel p-4 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <span className="text-[10px] font-bold text-white uppercase tracking-tighter font-label">Completed</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
            <span className="text-[10px] font-bold text-white uppercase tracking-tighter font-label">Assigned</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
            <span className="text-[10px] font-bold text-white uppercase tracking-tighter font-label">Pending</span>
          </div>
        </div>
        <div className="w-full bg-surface-container-lowest relative pt-24 pb-4 px-4 h-[500px]">
           <CivicMap tasks={allTasks} workers={workers} className="w-full h-full rounded-b-xl" />
        </div>
      </section>

      {/* Row 3: Charts Bento Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 bg-surface-container rounded-xl p-8 flex flex-col shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h4 className="text-lg font-bold text-white font-headline">Task Velocity</h4>
              <p className="text-xs text-on-surface-variant font-body">Daily completion rates vs. target</p>
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] text-white font-bold font-label">WEEKLINK</span>
              <span className="px-3 py-1 text-[10px] text-on-surface-variant font-bold hover:text-white transition-colors cursor-pointer font-label">MONTHLY</span>
            </div>
          </div>
          <div className="flex-grow h-48 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={4} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3449" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#c3c6d7', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#c3c6d7', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#171f33' }} />
                <Bar dataKey="assigned"  fill="#131b2e" radius={[4, 4, 0, 0]} name="Assigned" />
                <Bar dataKey="completed" fill="#2563eb" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-surface-container rounded-xl p-8 flex flex-col shadow-sm">
          <h4 className="text-lg font-bold text-white font-headline mb-6">Top Productivity</h4>
          <div className="space-y-6 flex-grow">
            {workersLoading ? (
               Array.from({ length: 4 }).map((_, i) => (
                 <div key={i} className="animate-pulse space-y-2">
                   <div className="h-3 bg-surface-container-highest rounded w-1/3"></div>
                   <div className="h-2 bg-surface-container-highest rounded-full w-full"></div>
                 </div>
               ))
            ) : topWorkers.slice(0, 4).map((w, i) => (
               <div key={w.id} className="space-y-2">
                 <div className="flex justify-between text-[11px] font-bold text-on-surface-variant uppercase tracking-tight font-label">
                   <span>{w.full_name}</span>
                   <span className="text-white">{w.performance_score.toFixed(1)}</span>
                 </div>
                 <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                   <div 
                     className={i === 0 ? "bg-secondary h-full rounded-full" : "bg-primary-container h-full rounded-full"} 
                     style={{ width: `${(w.performance_score / 10) * 100}%` }}
                   ></div>
                 </div>
               </div>
            ))}
          </div>
          <button onClick={() => navigate('/admin/workers')} className="mt-6 text-[10px] text-primary font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-80 transition-opacity font-label">
            View Ranking Details <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </section>

      {/* Row 4: Worker Activity Table */}
      <section className="bg-surface-container rounded-xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 flex justify-between items-center">
          <h4 className="text-lg font-bold text-white font-headline">Recent Tasks</h4>
          <div className="flex gap-4">
            <button className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-surface-bright transition-colors font-body">
              <span className="material-symbols-outlined text-sm">filter_list</span> Filter
            </button>
            <button onClick={() => navigate('/admin/tasks/new')} className="bg-primary-container text-on-primary-container px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity font-body">
              Create Task
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-left font-label">
                <th className="px-8 py-4 bg-surface-container-low font-semibold">Task Name</th>
                <th className="px-8 py-4 bg-surface-container-low font-semibold">Priority</th>
                <th className="px-8 py-4 bg-surface-container-low font-semibold text-center">Status</th>
                <th className="px-8 py-4 bg-surface-container-low font-semibold">Assigned To</th>
                <th className="px-8 py-4 bg-surface-container-low font-semibold text-right">Created</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium font-body bg-surface-container">
               {recentTasks.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="px-8 py-8 text-center text-sm text-on-surface-variant">No tasks found.</td>
                 </tr>
               ) : recentTasks.map(task => (
                 <tr key={task.id} onClick={() => navigate(`/admin/tasks/${task.id}`)} className="hover:bg-surface-container-highest transition-colors cursor-pointer group border-b border-surface-variant/30 last:border-0">
                   <td className="px-8 py-5">
                     <p className="text-slate-200 font-semibold truncate max-w-[200px]">{task.title}</p>
                     <p className="text-xs text-on-surface-variant capitalize">{task.category}</p>
                   </td>
                   <td className="px-8 py-5 text-on-surface-variant capitalize">
                     {task.priority === 'high' || task.priority === 'critical' ? (
                        <span className="text-error font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span>{task.priority}</span>
                     ) : task.priority}
                   </td>
                   <td className="px-8 py-5 text-center">
                     <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${task.status === 'completed' ? 'bg-secondary/10 text-secondary' : task.status === 'in_progress' ? 'bg-primary/10 text-primary' : task.status === 'pending' ? 'bg-tertiary-container/10 text-tertiary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                       {task.status.replace('_', ' ')}
                     </span>
                   </td>
                   <td className="px-8 py-5 flex items-center gap-3">
                     {task.assigned_to ? (
                       <>
                         <div className="w-8 h-8 rounded-lg bg-surface-container-lowest flex items-center justify-center text-[10px] font-bold text-primary border border-surface-variant">
                           {(workerMap[task.assigned_to]?.full_name ?? '?').charAt(0).toUpperCase()}
                         </div>
                         <span className="text-slate-200">{workerMap[task.assigned_to]?.full_name ?? 'Unknown'}</span>
                       </>
                     ) : (
                       <span className="text-on-surface-variant text-xs italic">Unassigned</span>
                     )}
                   </td>
                   <td className="px-8 py-5 text-right font-bold text-on-surface-variant font-headline">
                      {new Date(task.created_at).toLocaleDateString()}
                   </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
        {recentTasks.length > 0 && (
          <div className="p-4 bg-surface-container-low flex justify-center">
            <button onClick={() => navigate('/admin/tasks')} className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest hover:text-white transition-colors font-label">View All Tasks</button>
          </div>
        )}
      </section>
    </div>
  );
}
