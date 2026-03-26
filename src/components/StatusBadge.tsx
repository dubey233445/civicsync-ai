// Status badge component for task statuses and priorities

import { cn } from '@/lib/utils';

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
type Priority   = 'low' | 'medium' | 'high' | 'critical';

const statusConfig: Record<TaskStatus, { label: string; className: string; dot: string; icon: string }> = {
  pending:     { label: 'Pending',     className: 'bg-[#ffb596]/10 text-[#ffb596] border-[#ffb596]/30', dot: 'bg-[#ffb596]', icon: 'pending' },
  assigned:    { label: 'Assigned',    className: 'bg-primary/10 text-primary border-primary/30',        dot: 'bg-primary', icon: 'person_add' },
  in_progress: { label: 'In Progress', className: 'bg-tertiary/10 text-tertiary border-tertiary/30',     dot: 'bg-tertiary', icon: 'sync' },
  completed:   { label: 'Completed',   className: 'bg-secondary/10 text-secondary border-secondary/30',  dot: 'bg-secondary', icon: 'check_circle' },
  cancelled:   { label: 'Cancelled',   className: 'bg-error/10 text-error border-error/30',              dot: 'bg-error', icon: 'cancel' },
};

const priorityConfig: Record<Priority, { label: string; className: string; icon: string }> = {
  low:      { label: 'Low',      className: 'bg-slate-500/15 text-slate-400 border-slate-500/30', icon: 'keyboard_arrow_down' },
  medium:   { label: 'Medium',   className: 'bg-primary/10 text-primary border-primary/30', icon: 'horizontal_rule' },
  high:     { label: 'High',     className: 'bg-[#ffb596]/15 text-[#ffb596] border-[#ffb596]/30', icon: 'keyboard_arrow_up' },
  critical: { label: 'Critical', className: 'bg-error/15 text-error border-error/30', icon: 'keyboard_double_arrow_up' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
  showIcon?: boolean;
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = false }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-widest border',
      cfg.className, className
    )}>
      {showIcon ? (
         <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
      ) : (
         <span className={cn('w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]', cfg.dot)} />
      )}
      {cfg.label}
    </span>
  );
}

export function PriorityBadge({ priority, className, showIcon = false }: PriorityBadgeProps) {
  const cfg = priorityConfig[priority];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] uppercase font-black tracking-widest border',
      cfg.className, className
    )}>
      {showIcon && <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>}
      {cfg.label}
    </span>
  );
}
