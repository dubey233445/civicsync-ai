// Login and Register page for CivicSync
// Animated dark card with role selection

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, User, Eye, EyeOff, Zap, ArrowRight, Loader2 } from 'lucide-react';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const [tab, setTab]           = useState<Tab>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole]         = useState<'admin' | 'worker'>('worker');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (tab === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || 'Invalid credentials. Please try again.');
      }
      // Navigation handled by App.tsx route guard
    } else {
      if (!fullName.trim()) { setError('Full name is required.'); setLoading(false); return; }
      const { error } = await signUp(email, password, fullName, role);
      if (error) {
        setError(error.message || 'Registration failed. Please try again.');
      } else {
        setSuccess('Account created! Check your email to confirm, or try logging in.');
        setTab('login');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background grid-bg">
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md mx-auto px-4 animate-fade-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-primary">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Civic<span className="text-primary">Sync</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">AI-Powered Workforce Management</p>
        </div>

        {/* Card */}
        <div className="card-surface p-6 shadow-card">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-surface-2 rounded-lg mb-6">
            {(['login', 'register'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 capitalize
                  ${tab === t
                    ? 'bg-primary text-primary-foreground shadow-glow-primary'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name — register only */}
            {tab === 'register' && (
              <div className="space-y-1.5 animate-fade-in">
                <Label htmlFor="fullName" className="text-sm text-muted-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Alexandra Chen"
                  required
                  className="bg-surface-2 border-border focus:border-primary/50 focus:ring-primary/20"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@civicorg.gov"
                required
                className="bg-surface-2 border-border focus:border-primary/50 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-surface-2 border-border focus:border-primary/50 focus:ring-primary/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Role is always worker for self-registration */}

            {/* Error / success messages */}
            {error && (
              <div className="badge-overdue border rounded-lg px-3 py-2 text-sm animate-fade-in">
                {error}
              </div>
            )}
            {success && (
              <div className="badge-active border rounded-lg px-3 py-2 text-sm animate-fade-in">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-glow-primary active:scale-[0.98] transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>

          {/* Demo hint */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Register with role = <span className="text-primary font-mono">admin</span> to access the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
