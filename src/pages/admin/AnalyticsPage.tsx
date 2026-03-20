// Analytics page — submission review, approval/rejection, performance charts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchSubmissions, reviewSubmission } from '@/services/submissionService';
import { fetchWorkers } from '@/services/profileService';
import { fetchTaskStats } from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge } from '@/components/StatusBadge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { CheckCircle2, XCircle, Image, MapPin, FileText, Star } from 'lucide-react';
import { toast } from 'sonner';

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

  const { data: stats } = useQuery({
    queryKey: ['taskStats'],
    queryFn: fetchTaskStats,
  });

  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

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

  // Build per-worker submission data for chart
  const workerPerf = workers.slice(0, 8).map(w => {
    const workerSubs = submissions.filter(s => s.user_id === w.id);
    return {
      name: w.full_name.split(' ')[0],
      approved: workerSubs.filter(s => s.status === 'approved').length,
      submitted: workerSubs.filter(s => s.status === 'submitted').length,
      score: parseFloat(w.performance_score.toFixed(1)),
    };
  });

  // Task status distribution
  const statusData = stats ? [
    { name: 'Pending',     value: stats.pending,    fill: 'hsl(38 92% 50%)' },
    { name: 'Assigned',    value: stats.assigned,   fill: 'hsl(211 100% 50%)' },
    { name: 'In Progress', value: stats.inProgress, fill: 'hsl(160 75% 46%)' },
    { name: 'Completed',   value: stats.completed,  fill: 'hsl(160 75% 46%)' },
  ] : [];

  const pendingReview = submissions.filter(s => s.status === 'submitted');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Submissions, performance metrics, and task insights</p>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Worker performance */}
        <div className="card-surface p-5 shadow-card animate-fade-up delay-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Worker Performance</h2>
              <p className="text-xs text-muted-foreground">Approvals vs submissions</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={workerPerf} barGap={2} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 18% 20%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 55%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(220 22% 15% / 0.5)' }} />
              <Bar dataKey="submitted" fill="hsl(220 18% 25%)" radius={[4, 4, 0, 0]} name="Submitted" />
              <Bar dataKey="approved"  fill="hsl(160 75% 46%)" radius={[4, 4, 0, 0]} name="Approved"  />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Task status distribution */}
        <div className="card-surface p-5 shadow-card animate-fade-up delay-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Task Status Distribution</h2>
              <p className="text-xs text-muted-foreground">Current snapshot</p>
            </div>
          </div>
          <div className="space-y-3">
            {statusData.map(({ name, value, fill }) => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20">{name}</span>
                <div className="flex-1 bg-surface-3 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: stats?.total ? `${(value / stats.total) * 100}%` : '0%',
                      backgroundColor: fill,
                    }}
                  />
                </div>
                <span className="text-xs font-mono-data text-foreground tabular-nums w-6 text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submission Review Queue */}
      <div className="card-surface shadow-card animate-fade-up delay-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Submission Review Queue
              {pendingReview.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold">
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
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium text-sm">No submissions yet</p>
            <p className="text-xs text-muted-foreground mt-1">Worker submissions will appear here for review</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {submissions.slice(0, 10).map(sub => {
              const worker = workerMap[sub.user_id];
              return (
                <div key={sub.id} className="px-5 py-4 flex items-start gap-4 hover:bg-surface-2/30 transition-colors">
                  {/* Proof image */}
                  <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {sub.image_url ? (
                      <img
                        src={sub.image_url}
                        alt="Proof"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {(worker?.full_name ?? '?').charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {worker?.full_name ?? 'Unknown Worker'}
                      </span>
                      <StatusBadge status={'submitted' as any} className="scale-90" />
                    </div>
                    {sub.notes && (
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{sub.notes}</p>
                    )}
                    {sub.latitude && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {sub.latitude.toFixed(4)}, {sub.longitude?.toFixed(4)}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(sub.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Review actions */}
                  {sub.status === 'submitted' && (
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
                  )}
                  {sub.status !== 'submitted' && (
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


