// Status badge component for task statuses and priorities

import { cn } from '@/lib/utils';

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type Priority   = 'low' | 'medium' | 'high' | 'critical';

const statusConfig: Record<TaskStatus, { label: string; className: string; dot: string }> = {
  pending:     { label: 'Pending',     className: 'badge-pending',   dot: 'bg-amber-400' },
  assigned:    { label: 'Assigned',    className: 'badge-completed', dot: 'bg-blue-400' },
  in_progress: { label: 'In Progress', className: 'badge-active',    dot: 'bg-emerald-400' },
  completed:   { label: 'Completed',   className: 'badge-completed', dot: 'bg-blue-400' },
  cancelled:   { label: 'Cancelled',   className: 'badge-overdue',   dot: 'bg-red-400' },
};

const priorityConfig: Record<Priority, { label: string; className: string }> = {
  low:      { label: 'Low',      className: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  medium:   { label: 'Medium',   className: 'badge-pending' },
  high:     { label: 'High',     className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  critical: { label: 'Critical', className: 'badge-overdue' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
      cfg.className, className
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const cfg = priorityConfig[priority];
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      cfg.className, className
    )}>
      {cfg.label}
    </span>
  );
}
