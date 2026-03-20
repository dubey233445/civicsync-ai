// Workers management page — list, invite, and view worker performance

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkers, fetchAllUsers } from '@/services/profileService';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import {
  Users, Search, Plus, Star, MapPin,
  CheckCircle2, Clock, TrendingUp, MoreHorizontal,
  Shield, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function WorkersPage() {
  const [search, setSearch]   = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteName, setInviteName]     = useState('');
  const [invitePass, setInvitePass]     = useState('');
  const [inviteRole, setInviteRole]     = useState<'admin' | 'worker'>('worker');
  const [inviteLoading, setInviteLoading] = useState(false);
  const { signUp } = useAuth();

  const { data: allProfiles = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: fetchAllUsers,
  });

  const workers  = allProfiles.filter(p => p.role === 'worker');
  const filtered = workers.filter(w =>
    w.full_name.toLowerCase().includes(search.toLowerCase()) ||
    w.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePass.trim()) return;
    setInviteLoading(true);
    const { error } = await signUp(inviteEmail, invitePass, inviteName, inviteRole);
    if (error) {
      toast.error(error.message ?? 'Failed to create user');
    } else {
      toast.success(`${inviteRole === 'admin' ? 'Admin' : 'Worker'} account created successfully!`);
      setInviteOpen(false);
      setInviteEmail(''); setInviteName(''); setInvitePass('');
    }
    setInviteLoading(false);
  };

  const scoreColor = (score: number) =>
    score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold text-foreground">Workers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {workers.length} field workers registered
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-glow-primary">
              <Plus className="w-4 h-4" /> Add Worker
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-1 border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Full Name</Label>
                <Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="Marcus Johnson" className="bg-surface-2 border-border focus:border-primary/50" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="worker@civic.gov" className="bg-surface-2 border-border focus:border-primary/50" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Temporary Password</Label>
                <Input type="password" value={invitePass} onChange={e => setInvitePass(e.target.value)} placeholder="••••••••" className="bg-surface-2 border-border focus:border-primary/50" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Role</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'worker', l: 'Worker', I: User }, { v: 'admin', l: 'Admin', I: Shield }].map(({ v, l, I }) => (
                    <button key={v} type="button" onClick={() => setInviteRole(v as any)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all
                        ${inviteRole === v ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-surface-2 text-muted-foreground hover:text-foreground'}`}>
                      <I className="w-4 h-4" /> {l}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" disabled={inviteLoading} className="w-full bg-primary hover:bg-primary/90">
                {inviteLoading ? 'Creating...' : 'Create Account'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-up delay-100">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search workers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 bg-surface-1 border-border focus:border-primary/50"
        />
      </div>

      {/* Workers grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-surface p-5 shadow-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="shimmer w-12 h-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="shimmer h-4 rounded w-3/4" />
                  <div className="shimmer h-3 rounded w-1/2" />
                </div>
              </div>
              <div className="shimmer h-3 rounded w-full mb-2" />
              <div className="shimmer h-3 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-12 text-center animate-fade-up">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-foreground font-medium">No workers found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search ? 'Try a different search term' : 'Add workers to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((w, i) => (
            <div
              key={w.id}
              className="card-surface p-5 shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-up group"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Worker header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {w.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{w.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.email}</p>
                  {w.region && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{w.region}</span>
                    </div>
                  )}
                </div>
                <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ${w.is_active ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                  <div className={`w-2 h-2 rounded-full ${w.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                </div>
              </div>

              {/* Performance score */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="w-3 h-3" /> Performance
                  </span>
                  <span className={`text-sm font-bold font-mono-data tabular-nums ${scoreColor(w.performance_score)}`}>
                    {w.performance_score.toFixed(1)}/10
                  </span>
                </div>
                <div className="w-full bg-surface-3 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full score-gradient transition-all duration-500"
                    style={{ width: `${(w.performance_score / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Joined {new Date(w.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${w.is_active ? 'badge-active' : 'badge-overdue'}`}>
                  {w.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
