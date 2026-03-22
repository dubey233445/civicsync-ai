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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'profile' | 'security' | 'app';

const tabs: { id: Tab; label: string; icon: React.ComponentType<any> }[] = [
  { id: 'profile',  label: 'Profile',       icon: User },
  { id: 'security', label: 'Security',      icon: Lock },
  { id: 'app',      label: 'App Settings',  icon: Settings2 },
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and application preferences</p>
      </div>

      <div className="flex gap-6 animate-fade-up delay-100">
        {/* Sidebar tabs */}
        <nav className="w-48 shrink-0 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                activeTab === id
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-2 border border-transparent',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* Panel */}
        <div className="flex-1 min-w-0">

          {/* ── Profile Tab ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="card-surface p-6 shadow-card space-y-6 animate-fade-up">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground">{profile?.full_name}</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary border border-primary/30">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                  <Input
                    value={profileForm.full_name}
                    onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50"
                    placeholder="Your full name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input
                    value={profileForm.email}
                    disabled
                    className="bg-surface-2 border-border opacity-60 cursor-not-allowed"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Phone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50"
                    placeholder="+1 (555) 000-0000"
                    type="tel"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Region</Label>
                  <Input
                    value={profileForm.region}
                    onChange={e => setProfileForm(f => ({ ...f, region: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50"
                    placeholder="e.g. Downtown, North District"
                  />
                </div>
              </div>

              <Button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending || !profileForm.full_name.trim()}
                className={cn(
                  'gap-2 transition-all',
                  profileSaved ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {profileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : profileSaved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {profileSaved ? 'Saved!' : 'Save Profile'}
              </Button>
            </div>
          )}

          {/* ── Security Tab ─────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div className="card-surface p-6 shadow-card space-y-5 animate-fade-up">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
                  <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
                </div>
              </div>

              {/* Current password */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50 pr-10"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">New Password</Label>
                <div className="relative">
                  <Input
                    type={showNew ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="bg-surface-2 border-border focus:border-primary/50 pr-10"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength indicator */}
                {passwordForm.newPassword.length > 0 && (
                  <div className="flex gap-1 mt-1">
                    {[1,2,3,4].map(i => (
                      <div
                        key={i}
                        className={cn('h-1 flex-1 rounded-full transition-colors', {
                          'bg-red-500':    passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length < 6,
                          'bg-amber-500':  passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length >= 6 && passwordForm.newPassword.length < 10,
                          'bg-secondary':  passwordForm.newPassword.length >= i * 2 && passwordForm.newPassword.length >= 10,
                          'bg-surface-3':  passwordForm.newPassword.length < i * 2,
                        })}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    className={cn(
                      'bg-surface-2 border-border focus:border-primary/50 pr-10',
                      passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                        ? 'border-destructive/50'
                        : '',
                    )}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <Button
                onClick={() => passwordMutation.mutate()}
                disabled={
                  passwordMutation.isPending ||
                  !passwordForm.currentPassword ||
                  !passwordForm.newPassword ||
                  !passwordForm.confirmPassword ||
                  passwordForm.newPassword !== passwordForm.confirmPassword
                }
                className={cn(
                  'gap-2 transition-all',
                  passwordSaved ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {passwordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : passwordSaved ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {passwordSaved ? 'Password Changed!' : 'Change Password'}
              </Button>
            </div>
          )}

          {/* ── App Settings Tab ─────────────────────────────────────── */}
          {activeTab === 'app' && (
            <div className="card-surface p-6 shadow-card space-y-6 animate-fade-up">
              <div className="flex items-center gap-2 pb-4 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Application Settings</h2>
                  <p className="text-xs text-muted-foreground">Configure defaults for task management</p>
                </div>
              </div>

              {/* Task Assignment */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Task Assignment
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Default Priority</Label>
                    <Select
                      value={appSettings.defaultPriority}
                      onValueChange={v => setAppSettings(s => ({ ...s, defaultPriority: v }))}
                    >
                      <SelectTrigger className="bg-surface-2 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-1 border-border">
                        {['low', 'medium', 'high', 'critical'].map(p => (
                          <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Assignment Radius (km)
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={200}
                      value={appSettings.assignmentRadiusKm}
                      onChange={e => setAppSettings(s => ({ ...s, assignmentRadiusKm: Number(e.target.value) }))}
                      className="bg-surface-2 border-border focus:border-primary/50 font-mono-data"
                    />
                    <p className="text-xs text-muted-foreground">Workers beyond this distance are deprioritized</p>
                  </div>
                </div>

                {/* Auto-assign toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Settings2 className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Auto-Assignment</p>
                      <p className="text-xs text-muted-foreground">Automatically suggest best worker on task creation</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppSettings(s => ({ ...s, autoAssignEnabled: !s.autoAssignEnabled }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      appSettings.autoAssignEnabled ? 'bg-primary' : 'bg-surface-3',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                      appSettings.autoAssignEnabled ? 'translate-x-5' : 'translate-x-0',
                    )} />
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" /> Notifications
                </h3>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Submission Alerts</p>
                      <p className="text-xs text-muted-foreground">Get notified when workers submit proof</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppSettings(s => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      appSettings.notificationsEnabled ? 'bg-primary' : 'bg-surface-3',
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow-sm',
                      appSettings.notificationsEnabled ? 'translate-x-5' : 'translate-x-0',
                    )} />
                  </button>
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Palette className="w-3.5 h-3.5" /> Task Categories
                </h3>
                <Label className="text-xs text-muted-foreground">Comma-separated list of task categories</Label>
                <Textarea
                  value={appSettings.taskCategories}
                  onChange={e => setAppSettings(s => ({ ...s, taskCategories: e.target.value }))}
                  rows={3}
                  className="bg-surface-2 border-border focus:border-primary/50 resize-none font-mono-data text-xs"
                />
              </div>

              <Button
                onClick={handleSaveApp}
                className={cn(
                  'gap-2 transition-all',
                  appSaved ? 'bg-secondary hover:bg-secondary/90' : 'bg-primary hover:bg-primary/90',
                )}
              >
                {appSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {appSaved ? 'Settings Saved!' : 'Save Settings'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
