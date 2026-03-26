// Workers management page — list, invite, and view worker performance

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkers, fetchAllUsers } from '@/services/profileService';
import {
  Users, Search, Plus, Star, MapPin,
  Shield, User, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogTrigger,
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
  const navigate = useNavigate();

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
      toast.success(`${inviteRole === 'admin' ? 'Executive' : 'Operative'} account provisioned!`);
      setInviteOpen(false);
      setInviteEmail(''); setInviteName(''); setInvitePass('');
    }
    setInviteLoading(false);
  };

  const scoreColor = (score: number) =>
    score >= 8 ? 'text-primary' : score >= 6 ? 'text-tertiary' : 'text-error';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100 font-headline tracking-tight">Active Operatives</h1>
          <p className="font-body text-sm text-on-surface-variant mt-1">
            {workers.length} field operatives globally deployed
          </p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold tracking-wide rounded-xl px-6 py-2 h-auto shadow-lg shadow-[#2563EB]/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">person_add</span> Provision Account
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-surface-container-high border-white/5 max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden">
            <header className="p-6 pb-4 border-b border-white/5 bg-surface-container">
              <h2 className="font-headline text-xl font-bold text-on-surface">Provision Personnel</h2>
              <p className="font-body text-xs text-on-surface-variant mt-1">Create an enterprise access account.</p>
            </header>
            <form onSubmit={handleInvite} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Full Name</label>
                <input 
                  className="w-full bg-[#131b2e] border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 rounded-xl py-3 px-4 outline-none font-body transition-all placeholder:text-outline" 
                   value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="e.g. Marcus Johnson" required 
                />
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Classification (Role)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: 'worker', l: 'Field Operative', I: 'badge' }, { v: 'admin', l: 'Executive', I: 'shield' }].map(({ v, l, I }) => (
                    <button 
                      key={v} type="button" onClick={() => setInviteRole(v as any)}
                      className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border text-sm font-bold transition-all
                        ${inviteRole === v ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/5 bg-[#131b2e] text-slate-400 hover:text-slate-200 hover:border-white/20'}`}>
                      <span className="material-symbols-outlined">{I}</span> {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Email Address</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">alternate_email</span>
                  <input 
                    type="email"
                    className="w-full bg-[#131b2e] border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none font-body transition-all placeholder:text-outline" 
                     value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="operative@civicsync.gov" required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Temporary Key</label>
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[18px]">key</span>
                  <input 
                    type="password"
                    className="w-full bg-[#131b2e] border border-white/5 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 text-slate-200 rounded-xl py-3 pl-11 pr-4 outline-none font-body transition-all placeholder:text-outline tracking-widest" 
                     value={invitePass} onChange={e => setInvitePass(e.target.value)} placeholder="••••••••" required 
                  />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" disabled={inviteLoading} className="w-full bg-[#2563EB] hover:bg-[#B4C5FF] hover:text-[#00174B] disabled:opacity-50 py-4 rounded-xl text-white font-headline font-black text-sm uppercase tracking-widest shadow-[0_8px_32px_rgba(37,99,235,0.2)] active:scale-95 transition-all">
                  {inviteLoading ? 'Provisioning...' : 'Provision Access'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Control Strip */}
      <div className="bg-surface-container-low border border-white/5 rounded-2xl p-4 flex flex-wrap gap-4 items-center">
        <div className="relative w-full max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
          <Input
            placeholder="Search personnel directory..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-surface-container border-none focus-visible:ring-1 focus-visible:ring-primary w-full rounded-xl font-body h-12 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Personnel Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container border border-white/5 rounded-2xl p-6 h-48 animate-pulse">
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-container border border-white/5 rounded-2xl p-16 text-center animate-fade-up">
          <span className="material-symbols-outlined text-5xl text-outline mb-4 opacity-50">person_off</span>
          <p className="text-slate-200 font-bold mb-1">No Operatives Found</p>
          <p className="text-sm text-outline">
            {search ? 'Try adjusting your search parameters.' : 'Provision new accounts to populate the directory.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((w, i) => (
            <div
              key={w.id}
              className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl hover:shadow-2xl hover:border-white/10 hover:bg-surface-container-high transition-all duration-300 animate-fade-up group cursor-pointer flex flex-col"
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate(`/admin/workers/${w.id}`)}
            >
              {/* Card Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="relative w-14 h-14 rounded-full border-2 border-primary/20 p-0.5 shrink-0 bg-surface">
                  <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-black text-primary font-headline">
                      {w.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface-container ${w.is_active ? 'bg-secondary shadow-[0_0_8px_#4edea3]' : 'bg-outline'}`} title={w.is_active ? 'Online' : 'Offline'}></div>
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-bold text-slate-100 text-lg truncate font-headline">{w.full_name}</p>
                  <p className="text-xs text-outline truncate font-medium tracking-wide">{w.email}</p>
                </div>
              </div>

              {/* Data Rows */}
              <div className="space-y-4 flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-outline uppercase tracking-widest font-bold text-[10px]">Zone</span>
                  <div className="flex items-center gap-1.5 text-slate-300 font-medium bg-[#131b2e] px-2.5 py-1 rounded border border-white/5">
                    <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
                    <span className="text-xs truncate max-w-[120px]">{w.region || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-outline uppercase tracking-widest font-bold text-[10px]">Rating</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(w.performance_score / 10) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold font-mono tracking-wider tabular-nums ${scoreColor(w.performance_score)}`}>
                      {w.performance_score.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-5 mt-4 border-t border-white/5">
                <span className="text-[10px] uppercase text-outline font-bold tracking-widest">
                  Auth: {new Date(w.created_at).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })}
                </span>
                <div className="flex items-center gap-2 group-hover:translate-x-1 transition-transform">
                  <span className="text-xs font-bold text-primary">Dossier</span>
                  <span className="material-symbols-outlined text-[16px] text-primary">arrow_forward</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
