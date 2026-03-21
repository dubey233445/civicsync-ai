// Task Detail Page — /admin/tasks/:id
// Shows full task info, assigned worker, submission history with photos,
// and approve / reject buttons for each submission.

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTaskById, updateTask } from '@/services/taskService';
import { fetchSubmissionsByTask, reviewSubmission } from '@/services/submissionService';
import { fetchWorkers } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { CivicMap } from '@/components/CivicMap';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  ArrowLeft, MapPin, Calendar, User, Tag, Zap,
  CheckCircle2, XCircle, Clock, Image, FileText,
  Loader2, Trash2, AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { profile } = useAuth();

  const { data: task, isLoading: taskLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => fetchTaskById(id!),
    enabled: !!id,
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ['submissions', id],
    queryFn: () => fetchSubmissionsByTask(id!),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
  });

  const workerMap = Object.fromEntries(workers.map(w => [w.id, w]));

  const reviewMutation = useMutation({
    mutationFn: ({ subId, status }: { subId: string; status: 'approved' | 'rejected' }) =>
      reviewSubmission(subId, status, profile!.id),
    onSuccess: (_, { status }) => {
      toast.success(status === 'approved' ? 'Submission approved ✓' : 'Submission rejected');
      qc.invalidateQueries({ queryKey: ['submissions', id] });
      qc.invalidateQueries({ queryKey: ['task', id] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['taskStats'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => updateTask(id!, { status: 'cancelled' }),
    onSuccess: () => {
      toast.success('Task cancelled');
      navigate('/admin/tasks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading task…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
        <AlertTriangle className="w-8 h-8" />
        <p>Task not found.</p>
        <Button variant="outline" onClick={() => navigate('/admin/tasks')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tasks
        </Button>
      </div>
    );
  }

  const assignedWorker = task.assigned_to ? workerMap[task.assigned_to] : null;
  const pendingSubs    = submissions.filter(s => s.status === 'submitted');
  const reviewedSubs   = submissions.filter(s => s.status !== 'submitted');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between animate-fade-up">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="mt-1 p-2 rounded-lg hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <StatusBadge status={task.status as any} />
              <PriorityBadge priority={task.priority as any} />
              {task.category && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" />{task.category}
                </span>
              )}
              {task.ai_assigned && (
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  <Zap className="w-3 h-3" /> AI Assigned
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {pendingSubs.length > 0 && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
              <Clock className="w-3 h-3" />
              {pendingSubs.length} pending review
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Cancel Task
          </Button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left col — task info + map */}
        <div className="lg:col-span-2 space-y-4">

          {/* Task details card */}
          <div className="card-surface p-5 shadow-card space-y-4 animate-fade-up delay-100">
            <h2 className="text-sm font-semibold text-foreground">Task Details</h2>

            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm text-foreground font-medium">
                    {task.location_name ?? `${task.latitude.toFixed(4)}, ${task.longitude.toFixed(4)}`}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {task.latitude.toFixed(5)}, {task.longitude.toFixed(5)}
                  </p>
                </div>
              </div>

              {task.due_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Due Date</p>
                    <p className="text-sm text-foreground font-medium">
                      {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm text-foreground font-medium">
                    {format(new Date(task.created_at), 'MMM d, yyyy · HH:mm')}
                  </p>
                </div>
              </div>

              {task.ai_score !== null && (
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">AI Score</p>
                    <p className="text-sm text-foreground font-medium font-mono">{task.ai_score?.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="card-surface shadow-card overflow-hidden animate-fade-up delay-200">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Task Location</span>
            </div>
            <CivicMap
              tasks={[task]}
              workers={assignedWorker ? [assignedWorker] : []}
              className="w-full h-[280px]"
            />
          </div>

          {/* Submissions */}
          <div className="card-surface shadow-card animate-fade-up delay-300">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Image className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Submissions
                  <span className="ml-2 text-xs font-normal text-muted-foreground">({submissions.length})</span>
                </h2>
              </div>
            </div>

            {subsLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                <FileText className="w-8 h-8 opacity-30" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {/* Pending first */}
                {[...pendingSubs, ...reviewedSubs].map(sub => {
                  const submitter = workerMap[sub.user_id];
                  const isPending  = sub.status === 'submitted';
                  const isApproved = sub.status === 'approved';

                  return (
                    <div key={sub.id} className="p-5 space-y-4">
                      {/* Submission header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {(submitter?.full_name ?? '?').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {submitter?.full_name ?? 'Unknown Worker'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(sub.created_at), 'MMM d, yyyy · HH:mm')}
                            </p>
                          </div>
                        </div>

                        {/* Status chip */}
                        <span className={`flex-shrink-0 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                          isApproved
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : sub.status === 'rejected'
                            ? 'bg-destructive/10 text-destructive border-destructive/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isApproved
                            ? <><CheckCircle2 className="w-3 h-3" /> Approved</>
                            : sub.status === 'rejected'
                            ? <><XCircle className="w-3 h-3" /> Rejected</>
                            : <><Clock className="w-3 h-3" /> Pending Review</>
                          }
                        </span>
                      </div>

                      {/* Photo */}
                      {sub.image_url && (
                        <a href={sub.image_url} target="_blank" rel="noopener noreferrer" className="block">
                          <img
                            src={sub.image_url}
                            alt="Submission proof"
                            className="w-full max-h-72 object-cover rounded-xl border border-border hover:border-primary/40 transition-colors cursor-zoom-in"
                          />
                        </a>
                      )}

                      {/* Notes */}
                      {sub.notes && (
                        <div className="bg-surface-2 rounded-lg px-4 py-3 text-sm text-muted-foreground border border-border">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground/70 mb-1">Notes</p>
                          {sub.notes}
                        </div>
                      )}

                      {/* GPS */}
                      {sub.latitude && sub.longitude && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Submitted from {sub.latitude.toFixed(5)}, {sub.longitude.toFixed(5)}
                        </p>
                      )}

                      {/* Reviewed by */}
                      {sub.reviewed_by && sub.reviewed_at && (
                        <p className="text-xs text-muted-foreground">
                          Reviewed by {workerMap[sub.reviewed_by]?.full_name ?? 'Admin'} on{' '}
                          {format(new Date(sub.reviewed_at), 'MMM d, yyyy · HH:mm')}
                        </p>
                      )}

                      {/* Approve / Reject buttons — only for pending */}
                      {isPending && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground gap-1.5"
                            onClick={() => reviewMutation.mutate({ subId: sub.id, status: 'approved' })}
                            disabled={reviewMutation.isPending}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 gap-1.5"
                            onClick={() => reviewMutation.mutate({ subId: sub.id, status: 'rejected' })}
                            disabled={reviewMutation.isPending}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right col — worker info */}
        <div className="space-y-4">

          {/* Assigned worker */}
          <div className="card-surface p-5 shadow-card space-y-4 animate-fade-up delay-100">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Assigned Worker</h2>
            </div>

            {assignedWorker ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {assignedWorker.full_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{assignedWorker.full_name}</p>
                    <p className="text-xs text-muted-foreground">{assignedWorker.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-2 rounded-lg p-3 text-center border border-border">
                    <p className="text-lg font-bold text-primary font-mono">
                      {(assignedWorker.performance_score ?? 7.5).toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">Performance</p>
                  </div>
                  <div className="bg-surface-2 rounded-lg p-3 text-center border border-border">
                    <p className={`text-sm font-bold ${assignedWorker.is_active ? 'text-secondary' : 'text-muted-foreground'}`}>
                      {assignedWorker.is_active ? 'Active' : 'Inactive'}
                    </p>
                    <p className="text-xs text-muted-foreground">Status</p>
                  </div>
                </div>

                {assignedWorker.region && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {assignedWorker.region}
                  </div>
                )}

                {assignedWorker.phone && (
                  <div className="text-xs text-muted-foreground">
                    📞 {assignedWorker.phone}
                  </div>
                )}

                {/* Performance bar */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Performance score</span>
                    <span className="text-foreground font-mono">{(assignedWorker.performance_score ?? 7.5).toFixed(1)}/10</span>
                  </div>
                  <div className="w-full bg-surface-3 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full score-gradient transition-all"
                      style={{ width: `${((assignedWorker.performance_score ?? 7.5) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-muted-foreground">
                <User className="w-8 h-8 opacity-30" />
                <p className="text-sm">No worker assigned</p>
              </div>
            )}
          </div>

          {/* Submission stats */}
          <div className="card-surface p-5 shadow-card space-y-3 animate-fade-up delay-200">
            <h2 className="text-sm font-semibold text-foreground">Submission Stats</h2>
            {[
              { label: 'Total', value: submissions.length, color: 'text-foreground' },
              { label: 'Pending Review', value: pendingSubs.length, color: 'text-amber-400' },
              { label: 'Approved', value: submissions.filter(s => s.status === 'approved').length, color: 'text-secondary' },
              { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length, color: 'text-destructive' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className={`text-sm font-bold font-mono ${color}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="card-surface p-5 shadow-card space-y-3 animate-fade-up delay-300">
            <h2 className="text-sm font-semibold text-foreground">Timeline</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-foreground font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(task.created_at), 'MMM d, yyyy · HH:mm')}</p>
                </div>
              </div>
              {task.assigned_to && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-foreground font-medium">Assigned</p>
                    <p className="text-xs text-muted-foreground">
                      {assignedWorker?.full_name ?? 'Worker'}
                      {task.ai_assigned ? ' (AI)' : ''}
                    </p>
                  </div>
                </div>
              )}
              {submissions.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-foreground font-medium">First Submission</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(submissions[submissions.length - 1].created_at), 'MMM d, yyyy · HH:mm')}
                    </p>
                  </div>
                </div>
              )}
              {task.status === 'completed' && (
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-foreground font-medium">Completed</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(task.updated_at), 'MMM d, yyyy · HH:mm')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
