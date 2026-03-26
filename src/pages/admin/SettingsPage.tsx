// Settings Page — Admin profile management + app-level configuration

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/profileService';
import { supabase } from '@/integrations/supabase/client';
import {
  User, Lock, Settings2, Save, Eye, EyeOff, Loader2,
  ShieldCheck, Sliders, MapPin, CheckCircle2, Bell, Palette,
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'profile' | 'security' | 'app';

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile',  label: 'Operative Profile',       icon: 'account_circle' },
  { id: 'security', label: 'Security Protocols',      icon: 'lock' },
  { id: 'app',      label: 'System Configuration',  icon: 'settings_applications' },
];

// App settings stored in localStorage for MVP (no backend table needed)
const APP_SETTINGS_KEY = 'civicsync_app_settings';
interface AppSettings {
  defaultPriority: string;
  assignmentRadiusKm: number;
  autoAssignEnabled: boolean;
  notificationsEnabled: boolean;
  taskCategories: string;
}
function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    defaultPriority: 'medium',
    assignmentRadiusKm: 25,
    autoAssignEnabled: true,
    notificationsEnabled: true,
    taskCategories: 'general, infrastructure, sanitation, safety, utilities, parks, roads',
  };
}
function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile form ──────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    email:     profile?.email     ?? '',
    phone:     profile?.phone     ?? '',
    region:    profile?.region    ?? '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  const profileMutation = useMutation({
    mutationFn: () => updateProfile(profile!.id, {
      full_name: profileForm.full_name.trim(),
      phone:     profileForm.phone.trim() || null,
      region:    profileForm.region.trim() || null,
    }),
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['profile'] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      toast.success('Profile updated successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── Password form ─────────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  const [showCurrent, setShowCurrent]     = useState(false);
  const [showNew, setShowNew]             = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      if (passwordForm.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      // Re-authenticate first
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    profile!.email,
        password: passwordForm.currentPassword,
      });
      if (signInErr) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
      toast.success('Password changed successfully');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ── App settings ──────────────────────────────────────────────────────
  const [appSettings, setAppSettings] = useState<AppSettings>(loadAppSettings);
  const [appSaved, setAppSaved] = useState(false);

  const handleSaveApp = () => {
    saveAppSettings(appSettings);
    setAppSaved(true);
    setTimeout(() => setAppSaved(false), 3000);
    toast.success('App settings saved');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-100 font-headline tracking-tight">System Configuration</h1>
        <p className="font-body text-sm text-on-surface-variant mt-1">
           Manage operative profile, security protocols, and global system parameters.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <nav className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                activeTab === id
                  ? 'bg-primary border border-primary text-[#0b1326] shadow-[0_0_15px_rgba(144,171,255,0.3)]'
                  : 'bg-surface-container border border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0">

          {/* ── Profile Tab ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-4 pb-4 border-b border-white/5 relative z-10">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-[#0b1326] border border-primary/30 flex items-center justify-center shadow-lg group hover:border-primary/50 transition-colors cursor-pointer relative overflow-hidden">
                  <span className="text-2xl font-black text-primary font-headline relative z-10">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                  </span>
                  <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-200 font-headline">{profile?.full_name}</h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 rounded text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                    <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span> Executive Clearance
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 relative z-10">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">badge</span> Full Designation
                  </label>
                  <input
                    value={profileForm.full_name}
                    onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="Enter full designation"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">mail</span> Comm Link (Email)
                  </label>
                  <input
                    value={profileForm.email}
                    disabled
                    className="w-full bg-[#131b2e] border border-white/5 rounded-lg px-4 py-3 text-sm text-slate-500 opacity-60 cursor-not-allowed font-mono tracking-wide"
                    placeholder="your@email.com"
                  />
                  <p className="text-[10px] text-error font-bold mt-1 uppercase tracking-widest flex items-center gap-1">
                     <span className="material-symbols-outlined text-[12px]">lock</span> Identity bound configuration.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">call</span> Secure Line (Phone)
                  </label>
                  <input
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary/50 transition-colors font-mono tracking-wide"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span> Assigned Zone
                  </label>
                  <input
                    value={profileForm.region}
                    onChange={e => setProfileForm(f => ({ ...f, region: e.target.value }))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-primary/50 transition-colors"
                    placeholder="e.g. Sector 7, Central District"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end relative z-10">
                <button
                  onClick={() => profileMutation.mutate()}
                  disabled={profileMutation.isPending || !profileForm.full_name.trim()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    profileSaved 
                      ? 'bg-secondary text-[#0b1326] border border-secondary shadow-[0_0_15px_rgba(78,222,163,0.3)]' 
                      : 'bg-primary text-[#0b1326] border border-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(144,171,255,0.3)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : profileSaved ? (
                     <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ) : (
                     <span className="material-symbols-outlined text-[16px]">save</span>
                  )}
                  {profileSaved ? 'Profile Secured!' : 'Commit Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Security Tab ─────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#ffb596]/5 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#ffb596]/10 border border-[#ffb596]/20 flex items-center justify-center">
                   <span className="material-symbols-outlined text-[#ffb596]">key</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-200 font-headline">Access Credentials</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Standard cryptographic requirements apply.</p>
                </div>
              </div>

              {/* Current password */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">password</span> Current Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-[#ffb596]/50 transition-colors pr-10 font-mono tracking-widest"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                     <span className="material-symbols-outlined text-[20px]">{showCurrent ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">vpn_key</span> New Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-[#ffb596]/50 transition-colors pr-10 font-mono tracking-widest"
                    placeholder="Minimum 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                     <span className="material-symbols-outlined text-[20px]">{showNew ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {/* Strength indicator */}
                {passwordForm.newPassword.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length < 6 ? 'bg-error shadow-[0_0_5px_currentColor]' :
                          passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length >= 6 && passwordForm.newPassword.length < 10 ? 'bg-[#ffb596] shadow-[0_0_5px_currentColor]' :
                          passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length >= 10 ? 'bg-secondary shadow-[0_0_5px_currentColor]' :
                          'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5 relative z-10">
                 <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">fact_check</span> Confirm Passphrase
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={`w-full bg-[#131b2e] border rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-[#ffb596]/50 transition-colors pr-10 font-mono tracking-widest ${
                      passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                        ? 'border-error/50 focus:border-error/50 shadow-[0_0_5px_rgba(215,56,59,0.2)]'
                        : 'border-white/10'
                    }`}
                    placeholder="Re-enter new passphrase"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"
                  >
                     <span className="material-symbols-outlined text-[20px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                  <p className="text-[10px] text-error uppercase font-bold tracking-widest mt-1 flex items-center gap-1">
                     <span className="material-symbols-outlined text-[12px]">warning</span> Passwords do not match
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end relative z-10">
                 <button
                   onClick={() => passwordMutation.mutate()}
                   disabled={
                     passwordMutation.isPending ||
                     !passwordForm.currentPassword ||
                     !passwordForm.newPassword ||
                     !passwordForm.confirmPassword ||
                     passwordForm.newPassword !== passwordForm.confirmPassword
                   }
                   className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                     passwordSaved 
                       ? 'bg-secondary text-[#0b1326] border border-secondary shadow-[0_0_15px_rgba(78,222,163,0.3)]' 
                       : 'bg-[#ffb596]/10 text-[#ffb596] border border-[#ffb596]/20 hover:bg-[#ffb596]/20 shadow-[0_0_15px_rgba(255,181,150,0.1)]'
                   } disabled:opacity-50 disabled:cursor-not-allowed`}
                 >
                   {passwordMutation.isPending ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                   ) : passwordSaved ? (
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                   ) : (
                      <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                   )}
                   {passwordSaved ? 'Credentials Updated!' : 'Rotate Credentials'}
                 </button>
              </div>
            </div>
          )}

          {/* ── App Settings Tab ─────────────────────────────────────── */}
          {activeTab === 'app' && (
            <div className="bg-surface-container border border-white/5 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/5 blur-3xl rounded-full pointer-events-none" />
              <div className="flex items-center gap-3 pb-4 border-b border-white/5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
                   <span className="material-symbols-outlined text-tertiary">tune</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-200 font-headline">Global Parameters</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">System-wide operational behavior overrides.</p>
                </div>
              </div>

              {/* Task Assignment */}
              <div className="space-y-4 relative z-10">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 bg-[#131b2e] px-4 py-2 border border-white/5 rounded-lg w-fit">
                   <span className="material-symbols-outlined text-[16px] text-tertiary">alt_route</span> Task Routing Matrix
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pl-2">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">priority_high</span> Base Line Priority
                     </label>
                     <select
                        value={appSettings.defaultPriority}
                        onChange={e => setAppSettings(s => ({ ...s, defaultPriority: e.target.value }))}
                        className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-tertiary/50 transition-colors uppercase tracking-wider font-bold text-[11px]"
                     >
                       <option value="low">Low</option>
                       <option value="medium">Medium</option>
                       <option value="high">High</option>
                       <option value="critical">Critical</option>
                     </select>
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">radar</span> Operational Radius (km)
                     </label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={appSettings.assignmentRadiusKm}
                      onChange={e => setAppSettings(s => ({ ...s, assignmentRadiusKm: Number(e.target.value) }))}
                      className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-tertiary/50 transition-colors font-mono tracking-widest"
                    />
                    <p className="text-[10px] text-slate-500 font-bold tracking-wide">Assets outside range receive deprioritization.</p>
                  </div>
                </div>

                {/* Auto-assign toggle */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b1326] border border-white/5 ml-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
                       <span className="material-symbols-outlined text-tertiary">psychiatry</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 font-headline">AI Auto-Assignment Protocol</p>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Enable predictive asset matching.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppSettings(s => ({ ...s, autoAssignEnabled: !s.autoAssignEnabled }))}
                    className={`relative w-12 h-6 rounded-full transition-colors border ${
                      appSettings.autoAssignEnabled ? 'bg-tertiary border-tertiary shadow-[0_0_10px_rgba(255,180,244,0.4)]' : 'bg-[#131b2e] border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      appSettings.autoAssignEnabled ? 'translate-x-6' : 'translate-x-0 bg-slate-400'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4 relative z-10">
                 <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 bg-[#131b2e] px-4 py-2 border border-white/5 rounded-lg w-fit">
                   <span className="material-symbols-outlined text-[16px] text-error">campaign</span> Communication Directives
                 </h3>
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b1326] border border-white/5 ml-2">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-error/10 border border-error/20 flex items-center justify-center">
                       <span className="material-symbols-outlined text-error">notifications_active</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-200 font-headline">Real-time Telemetry Alerts</p>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Receive notifications for field proof submissions.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppSettings(s => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))}
                    className={`relative w-12 h-6 rounded-full transition-colors border ${
                      appSettings.notificationsEnabled ? 'bg-error border-error shadow-[0_0_10px_rgba(215,56,59,0.4)]' : 'bg-[#131b2e] border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                      appSettings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0 bg-slate-400'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2 relative z-10">
                 <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2 bg-[#131b2e] px-4 py-2 border border-white/5 rounded-lg w-fit mb-3">
                   <span className="material-symbols-outlined text-[16px] text-[#ffb596]">category</span> Vector Classification Tags
                 </h3>
                 <div className="ml-2 space-y-2">
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global taxonomy list (comma delineated):</label>
                   <textarea
                     value={appSettings.taskCategories}
                     onChange={e => setAppSettings(s => ({ ...s, taskCategories: e.target.value }))}
                     rows={3}
                     className="w-full bg-[#131b2e] border border-white/10 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-[#ffb596]/50 transition-colors resize-none font-mono tracking-wide leading-relaxed"
                   />
                 </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end relative z-10">
                <button
                  onClick={handleSaveApp}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    appSaved 
                      ? 'bg-secondary text-[#0b1326] border border-secondary shadow-[0_0_15px_rgba(78,222,163,0.3)]' 
                      : 'bg-tertiary text-[#0b1326] border border-tertiary hover:bg-tertiary/90 shadow-[0_0_15px_rgba(255,180,244,0.3)]'
                  }`}
                >
                  {appSaved ? (
                     <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ) : (
                     <span className="material-symbols-outlined text-[16px]">save</span>
                  )}
                  {appSaved ? 'Parameters Locked' : 'Commit Configuration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
