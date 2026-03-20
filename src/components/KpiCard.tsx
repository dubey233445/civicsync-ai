// KPI Card component used in the Admin Dashboard
// Supports trend indicators, icons, and animated counters

import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;  // percentage change
  accentColor?: 'primary' | 'secondary' | 'accent' | 'destructive';
  animationDelay?: number;
  loading?: boolean;
}

const accentStyles = {
  primary:     { bg: 'bg-primary/10',     border: 'border-primary/20',     icon: 'text-primary',     glow: 'shadow-glow-primary' },
  secondary:   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'shadow-glow-secondary' },
  accent:      { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   icon: 'text-amber-400',   glow: 'shadow-accent' },
  destructive: { bg: 'bg-red-500/10',     border: 'border-red-500/20',     icon: 'text-red-400',     glow: '' },
};

export function KpiCard({
  title, value, subtitle, icon: Icon, trend,
  accentColor = 'primary', animationDelay = 0, loading = false,
}: KpiCardProps) {
  const styles = accentStyles[accentColor];

  const TrendIcon = trend === undefined ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === undefined
    ? 'text-muted-foreground'
    : trend > 0 ? 'text-emerald-400' : 'text-red-400';

  if (loading) {
    return (
      <div className="card-surface p-5 shadow-card">
        <div className="shimmer h-4 w-24 rounded mb-3" />
        <div className="shimmer h-8 w-16 rounded mb-2" />
        <div className="shimmer h-3 w-32 rounded" />
      </div>
    );
  }

  return (
    <div
      className="card-surface p-5 shadow-card hover:shadow-card-hover transition-all duration-300 group animate-fade-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center border transition-transform group-hover:scale-110',
          styles.bg, styles.border
        )}>
          <Icon className={cn('w-5 h-5', styles.icon)} />
        </div>

        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-foreground font-mono-data tabular-nums">
          {value}
        </p>
        {subtitle && (
          <p className="text-muted-foreground text-xs">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
