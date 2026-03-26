// Task Detail Page — /admin/tasks/:id
// Shows full task info, assigned worker, submission history with photos,
// and approve / reject buttons for each submission.

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTaskById, updateTask } from '@/services/taskService';
import { fetchSubmissionsByTask, reviewSubmission } from '@/services/submissionService';
import { fetchWorkers } from '@/services/profileService';
import { useAuth } from '@/contexts/AuthContext';
import { CivicMap } from '@/components/CivicMap';
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
      toast.success(status === 'approved' ? 'Log cleared ✓' : 'Log rejected');
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
      toast.success('Operation aborted');
      navigate('/admin/tasks');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (taskLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 font-headline animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" /> Loading Intelligence…
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-500 font-body">
        <AlertTriangle className="w-10 h-10 text-error opacity-80" />
        <p className="font-bold text-slate-300">Operation Record Not Found.</p>
        <button 
          className="bg-surface-container border border-white/10 hover:bg-white/5 py-2 px-4 rounded-lg text-slate-300 font-bold transition-all mt-2" 
          onClick={() => navigate('/admin/tasks')}
        >
           Return to Active Operations
        </button>
      </div>
    );
  }

  const assignedWorker = task.assigned_to ? workerMap[task.assigned_to] : null;
  const pendingSubs    = submissions.filter(s => s.status === 'submitted');
  const reviewedSubs   = submissions.filter(s => s.status !== 'submitted');

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/admin/tasks')}
            className="mt-1 h-10 w-10 flex items-center justify-center rounded-xl bg-surface-container border border-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-100 font-headline tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap text-xs font-bold uppercase tracking-widest">
              <span className={`px-2 py-1 rounded border border-white/5 bg-[#131b2e] text-slate-300`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={`px-2 py-1 rounded border border-white/5 ${task.priority === 'critical' ? 'bg-error/10 text-error' : task.priority === 'high' ? 'bg-[#ffb596]/10 text-[#ffb596]' : 'text-primary'}`}>
                {task.priority} Priority
              </span>
              {task.category && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-surface-container border border-white/5 text-slate-400 rounded">
                  <Tag className="w-3 h-3" />{task.category}
                </span>
              )}
              {task.ai_assigned && (
                <span className="flex items-center gap-1.5 px-2 py-1 bg-tertiary/10 text-tertiary border border-tertiary/20 rounded">
                  <span className="material-symbols-outlined text-[14px]">psychiatry</span> AI Assigned
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {pendingSubs.length > 0 && (
            <span className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest px-3 py-1.5 rounded-lg bg-error/10 text-error border border-error/20">
              <Clock className="w-3.5 h-3.5" />
              {pendingSubs.length} Pending Review
            </span>
          )}
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-error/20 text-error hover:bg-error/10 transition-all text-[10px] uppercase tracking-widest font-bold disabled:opacity-50"
            onClick={() => { if(confirm('Abort this operation?')) deleteMutation.mutate() }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Abort
          </button>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

        {/* Left col — task info + map */}
        <div className="lg:col-span-2 space-y-6">

          {/* Task details card */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
               <span className="material-symbols-outlined text-primary">data_object</span>
               <h2 className="text-lg font-bold text-slate-200 font-headline">Intelligence Briefing</h2>
            </div>

            {task.description ? (
              <p className="text-sm text-slate-400 leading-relaxed font-body whitespace-pre-line mb-6">{task.description}</p>
            ) : (
               <p className="text-sm text-outline italic font-body mb-6">No operational briefing provided.</p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 pt-2">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold flex items-center gap-1.5">
                   <MapPin className="w-3 h-3 text-slate-500" /> Location
                </p>
                <p className="text-sm text-slate-200 font-bold truncate">
                  {task.location_name ?? `${task.latitude.toFixed(4)}, ${task.longitude.toFixed(4)}`}
                </p>
                <p className="text-xs text-slate-500 font-mono truncate">
                  {task.latitude.toFixed(5)}, {task.longitude.toFixed(5)}
                </p>
              </div>

              {task.due_date && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold flex items-center gap-1.5">
                     <Calendar className="w-3 h-3 text-slate-500" /> Deadline
                  </p>
                  <p className="text-sm text-slate-200 font-bold">
                    {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-outline font-bold flex items-center gap-1.5">
                   <Clock className="w-3 h-3 text-slate-500" /> Initialized
                </p>
                <p className="text-sm text-slate-200 font-bold">
                   {format(new Date(task.created_at), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                   {format(new Date(task.created_at), 'HH:mm:ss')}
                </p>
              </div>

              {task.ai_score !== null && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-outline font-bold flex items-center gap-1.5">
                     <Zap className="w-3 h-3 text-tertiary" /> AI Match Score
                  </p>
                  <p className="text-lg text-tertiary font-black font-mono">{task.ai_score?.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 bg-surface-container-low">
              <span className="material-symbols-outlined text-primary">pin_drop</span>
              <span className="text-sm font-bold text-slate-200 font-headline uppercase tracking-widest">Target Vector</span>
            </div>
            <div className="relative">
              <CivicMap
                tasks={[task]}
                workers={assignedWorker ? [assignedWorker] : []}
                className="w-full h-[320px]"
              />
               <div className="absolute bottom-4 left-4 right-4 flex justify-between pointer-events-none">
                 <div className="bg-[#0b1326]/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase text-primary font-mono select-none">
                    TGT: {task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}
                 </div>
                 {assignedWorker?.latitude && (
                    <div className="bg-[#0b1326]/80 backdrop-blur border border-white/10 px-3 py-1.5 rounded text-[10px] font-bold tracking-widest uppercase text-secondary font-mono select-none">
                       OPR: {assignedWorker.latitude.toFixed(4)}, {assignedWorker.longitude.toFixed(4)}
                    </div>
                 )}
               </div>
            </div>
          </div>

          {/* Submissions */}
          <div className="bg-surface-container border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-white/5 flex items-center gap-2 bg-surface-container-low">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="text-lg font-bold text-slate-200 font-headline">
                Deployment Logs
              </h2>
              <span className="ml-auto bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-bold">{submissions.length} Total</span>
            </div>

            {subsLoading ? (
              <div className="flex justify-center py-16 text-slate-500 font-mono text-sm">
                <Loader2 className="w-5 h-5 animate-spin mr-3 text-primary" /> Decrypting logs...
              </div>
            ) : submissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-outline">
                <span className="material-symbols-outlined text-6xl opacity-20">subject</span>
                <p className="text-sm font-bold tracking-wide">No Deployment Logs Received</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {/* Pending first */}
                {[...pendingSubs, ...reviewedSubs].map(sub => {
                  const submitter = workerMap[sub.user_id];
                  const isPending  = sub.status === 'submitted';
                  const isApproved = sub.status === 'approved';

                  return (
                    <div key={sub.id} className="p-6 space-y-5">
                      {/* Submission header */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-black text-primary font-headline">
                              {(submitter?.full_name ?? '?').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-base font-bold text-slate-200 font-headline">
                              {submitter?.full_name ?? 'Unknown Operative'}
                            </p>
                            <p className="text-xs text-slate-500 font-mono tracking-wide mt-0.5">
                              {format(new Date(sub.created_at), 'MMM d, yy · HH:mm:ss')}
                            </p>
                          </div>
                        </div>

                        {/* Status chip */}
                        <span className={`flex-shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border ${
                          isApproved
                            ? 'bg-secondary/10 text-secondary border-secondary/20'
                            : sub.status === 'rejected'
                            ? 'bg-error/10 text-error border-error/20'
                            : 'bg-[#ffb596]/10 text-[#ffb596] border-[#ffb596]/20'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                             {isApproved ? 'verified' : sub.status === 'rejected' ? 'block' : 'pending'}
                          </span>
                          {isApproved ? 'Cleared' : sub.status === 'rejected' ? 'Rejected' : 'Review Req.'}
                        </span>
                      </div>

                      {/* Photo */}
                      {sub.image_url && (
                        <a href={sub.image_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                          <div className="bg-[#0b1326] border border-white/5 rounded-xl overflow-hidden relative group">
                             <img
                               src={sub.image_url}
                               alt="Field Proof"
                               className="w-full max-h-96 object-contain group-hover:scale-105 transition-transform duration-700"
                             />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                               <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-4xl drop-shadow-lg">open_in_full</span>
                             </div>
                          </div>
                        </a>
                      )}

                      {/* Notes */}
                      {sub.notes ? (
                        <div className="bg-[#131b2e] rounded-xl px-5 py-4 text-sm text-slate-300 border border-white/5 font-body leading-relaxed">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 font-mono flex items-center gap-1.5">
                             <span className="material-symbols-outlined text-[14px]">notes</span> Operative Notes
                          </p>
                          {sub.notes}
                        </div>
                      ) : (
                         <div className="bg-[#131b2e] rounded-xl px-5 py-3 text-sm text-outline border border-white/5 font-body italic flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">speaker_notes_off</span> No field notes recorded.
                         </div>
                      )}

                      {/* Meta */}
                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-4">
                         <div className="flex items-center gap-4">
                            {sub.latitude && sub.longitude && (
                               <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5 tracking-wider bg-[#0b1326] px-2 py-1 rounded">
                                 <span className="material-symbols-outlined text-[14px] text-primary">my_location</span>
                                 LOC: {sub.latitude.toFixed(5)}, {sub.longitude.toFixed(5)}
                               </p>
                             )}
                             {sub.reviewed_by && sub.reviewed_at && (
                               <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 tracking-wider">
                                 <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                                 By {workerMap[sub.reviewed_by]?.full_name ?? 'Admin'}
                               </p>
                             )}
                         </div>

                        {/* Approve / Reject buttons — only for pending */}
                        {isPending && (
                          <div className="flex gap-3">
                             <button
                              className="px-4 py-2 bg-secondary/10 hover:bg-secondary border border-secondary/20 hover:border-secondary text-secondary hover:text-[#0b1326] rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                              onClick={() => reviewMutation.mutate({ subId: sub.id, status: 'approved' })}
                              disabled={reviewMutation.isPending}
                            >
                              <span className="material-symbols-outlined text-[16px]">check_circle</span> Clear
                            </button>
                            <button
                              className="px-4 py-2 bg-[#131b2e] hover:bg-error/20 border border-error/20 text-error rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                              onClick={() => reviewMutation.mutate({ subId: sub.id, status: 'rejected' })}
                              disabled={reviewMutation.isPending}
                            >
                              <span className="material-symbols-outlined text-[16px]">cancel</span> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right col — worker info */}
        <div className="space-y-6">

          {/* Assigned worker */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             {assignedWorker && (
               <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full" />
             )}
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary">person</span>
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Assigned Operative</h2>
            </div>

            {assignedWorker ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate(`/admin/workers/${assignedWorker.id}`)}>
                  <div className="relative w-14 h-14 rounded-full border border-primary/20 flex flex-shrink-0 items-center justify-center bg-[#0b1326] group-hover:border-primary/50 transition-colors">
                    <span className="text-xl font-black text-primary font-headline">
                      {assignedWorker.full_name.charAt(0)}
                    </span>
                     <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-surface-container ${assignedWorker.is_active ? 'bg-secondary' : 'bg-outline'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-200 font-headline group-hover:text-primary transition-colors truncate">{assignedWorker.full_name}</p>
                    <p className="text-xs text-outline font-medium tracking-wide truncate">{assignedWorker.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#131b2e] rounded-xl p-3 text-center border border-white/5">
                    <p className="text-xl font-black text-primary font-mono mb-1">
                      {(assignedWorker.performance_score ?? 7.5).toFixed(1)}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">AI Rank</p>
                  </div>
                  <div className="bg-[#131b2e] rounded-xl p-3 text-center border border-white/5">
                    <p className={`text-base font-black font-headline uppercase tracking-wider mb-1 mt-1 ${assignedWorker.is_active ? 'text-secondary' : 'text-slate-500'}`}>
                      {assignedWorker.is_active ? 'Active' : 'Offline'}
                    </p>
                    <p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Status</p>
                  </div>
                </div>
                
                <div className="space-y-3 px-1">
                  {assignedWorker.region && (
                    <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">location_on</span>
                      {assignedWorker.region}
                    </div>
                  )}

                  {assignedWorker.phone && (
                    <div className="flex items-center gap-3 text-xs text-slate-300 font-medium">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">call</span>
                      {assignedWorker.phone}
                    </div>
                  )}
                </div>

                {/* Performance bar */}
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                    <span>Performance Matrix</span>
                    <span className="text-primary font-mono">{(assignedWorker.performance_score ?? 7.5).toFixed(1)}/10</span>
                  </div>
                  <div className="w-full bg-[#131b2e] border border-white/5 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(144,171,255,0.5)]"
                      style={{ width: `${((assignedWorker.performance_score ?? 7.5) / 10) * 100}%` }}
                    />
                  </div>
                </div>
                
                <button 
                  className="w-full py-3 bg-surface-container-high hover:bg-white/5 border border-white/5 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-300 transition-all flex items-center justify-center gap-2 mt-4"
                  onClick={() => navigate(`/admin/workers/${assignedWorker.id}`)}
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span> Open Dossier
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-outline">
                <span className="material-symbols-outlined text-5xl opacity-20">person_off</span>
                <p className="text-xs font-bold uppercase tracking-widest">No Operative Assigned</p>
              </div>
            )}
          </div>

          {/* Submission stats */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 blur-2xl rounded-full" />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-2 border-b border-white/5 pb-4 flex items-center gap-2">
               <span className="material-symbols-outlined text-tertiary">analytics</span>
               Log Analysis
            </h2>
            <div className="grid grid-cols-2 gap-3 pt-2">
               {[
                 { label: 'Total', value: submissions.length, color: 'text-slate-200' },
                 { label: 'Pending', value: pendingSubs.length, color: 'text-[#ffb596]' },
                 { label: 'Cleared', value: submissions.filter(s => s.status === 'approved').length, color: 'text-secondary' },
                 { label: 'Rejected', value: submissions.filter(s => s.status === 'rejected').length, color: 'text-error' },
               ].map(({ label, value, color }) => (
                 <div key={label} className="bg-[#131b2e] border border-white/5 rounded-lg p-3 text-center">
                   <p className={`text-xl font-black font-mono mb-1 ${color}`}>{value}</p>
                   <p className="text-[9px] uppercase tracking-widest text-outline font-bold">{label}</p>
                 </div>
               ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest mb-1 flex items-center gap-2">
               <span className="material-symbols-outlined text-primary">timeline</span>
               Event History
            </h2>
            <div className="space-y-4 pt-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-white/5">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="w-4 h-4 rounded-full border-[3px] border-surface-container bg-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow sm:shadow-md z-10" />
                <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:pr-3 md:group-even:pl-3">
                  <div className="flex flex-col">
                     <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-0.5">Operation Initialized</p>
                     <p className="text-[10px] text-slate-500 font-mono">{format(new Date(task.created_at), 'MMM d, yy · HH:mm')}</p>
                  </div>
                </div>
              </div>
              
              {task.assigned_to && (
                 <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="w-4 h-4 rounded-full border-[3px] border-surface-container bg-tertiary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow sm:shadow-md z-10 flex items-center justify-center">
                      {task.ai_assigned && <span className="material-symbols-outlined text-[8px] text-surface-container" style={{fontVariationSettings: "'FILL' 1"}}>psychiatry</span>}
                   </div>
                   <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:pr-3 md:group-even:pl-3">
                     <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-0.5">Operative Assigned</p>
                        <p className="text-[10px] text-slate-500">
                          {assignedWorker?.full_name ?? 'Worker'} {task.ai_assigned ? '(AI)' : ''}
                        </p>
                     </div>
                   </div>
                 </div>
              )}

              {submissions.length > 0 && (
                 <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="w-4 h-4 rounded-full border-[3px] border-surface-container bg-[#ffb596] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow sm:shadow-md z-10" />
                   <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:pr-3 md:group-even:pl-3">
                     <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-0.5">First Log Received</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {format(new Date(submissions[submissions.length - 1].created_at), 'MMM d, yy · HH:mm')}
                        </p>
                     </div>
                   </div>
                 </div>
              )}

              {task.status === 'completed' && (
                 <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                   <div className="w-4 h-4 rounded-full border-[3px] border-surface-container bg-secondary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow sm:shadow-md z-10" />
                   <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-odd:pr-3 md:group-even:pl-3">
                     <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-0.5 text-secondary">Objective Cleared</p>
                        <p className="text-[10px] text-slate-500 font-mono">{format(new Date(task.updated_at), 'MMM d, yy · HH:mm')}</p>
                     </div>
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
