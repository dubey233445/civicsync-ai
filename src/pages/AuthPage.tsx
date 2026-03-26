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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col pt-16 pb-12 px-6">
      <header className="fixed top-0 w-full z-50 bg-[#060d20]/80 backdrop-blur-xl flex items-center justify-center px-6 h-16 left-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">security</span>
          <span className="text-xl font-extrabold tracking-tighter text-[#dee5ff] font-headline">CivicSync</span>
        </div>
      </header>

      <main className="flex-grow flex flex-col animate-fade-up pt-8">
        <section className="mt-8 mb-10 flex flex-col items-center text-center">
          <div className="relative w-full aspect-square max-w-[280px] mb-8 group">
            <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full"></div>
            <div className="relative w-full h-full rounded-full border border-outline-variant/20 overflow-hidden bg-surface-container flex items-center justify-center">
              <span className="absolute material-symbols-outlined text-primary text-6xl opacity-80" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
            </div>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface mb-2 leading-tight font-headline">
            Welcome <span className="text-primary">Sentinel</span>
          </h1>
          <p className="text-on-surface-variant text-base max-w-[280px] font-body">
            Access the command center for your global workforce logistics.
          </p>
        </section>

        <section className="w-full max-w-md mx-auto">
          {tab === 'register' && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-headline text-on-surface">Create an Account</h2>
              <button onClick={() => { setTab('login'); setError(null); setSuccess(null); }} className="text-sm font-bold text-primary hover:underline">Back to Login</button>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {tab === 'register' && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase ml-1 font-label" htmlFor="fullName">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">person</span>
                  </div>
                  <input
                    className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none font-body"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alexandra Chen"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase ml-1 font-label" htmlFor="email">
                Email
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">alternate_email</span>
                </div>
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-4 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none font-body"
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@civicsync.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end px-1">
                <label className="text-xs font-semibold text-on-surface-variant tracking-wider uppercase font-label" htmlFor="password">
                  Password
                </label>
                {tab === 'login' && (
                  <a className="text-xs text-primary hover:text-primary-fixed-dim transition-colors font-label" href="#">Forgot?</a>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-on-surface-variant group-focus-within:text-primary transition-colors">lock</span>
                </div>
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 pl-12 pr-12 text-on-surface placeholder:text-outline focus:ring-1 focus:ring-primary/40 transition-all outline-none font-body"
                  id="password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  className="absolute inset-y-0 right-4 flex items-center text-on-surface-variant hover:text-on-surface"
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                >
                  <span className="material-symbols-outlined">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container border border-error/50 rounded-xl px-4 py-3 text-sm animate-fade-in font-body">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-secondary-container text-on-secondary-container border border-secondary/50 rounded-xl px-4 py-3 text-sm animate-fade-in font-body">
                {success}
              </div>
            )}

            <button
              className="w-full primary-gradient text-on-primary font-bold py-4 rounded-xl shadow-[0_8px_16px_-4px_rgba(49,107,243,0.3)] hover:shadow-[0_12px_24px_-4px_rgba(49,107,243,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-8 font-label disabled:opacity-70"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <>
                  {tab === 'login' ? 'Sign In' : 'Create Account'}
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </button>
          </form>

          {tab === 'login' && (
            <div className="mt-12 text-center">
              <p className="text-on-surface-variant text-sm font-body">
                New to the network?
                <button onClick={() => { setTab('register'); setError(null); setSuccess(null); }} className="text-primary font-bold hover:underline decoration-2 underline-offset-4 ml-1">Create an Account</button>
              </p>
            </div>
          )}

          {tab === 'login' && (
            <section className="mt-12 w-full max-w-md mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-grow bg-outline-variant/20"></div>
                <span className="text-[10px] font-bold text-outline uppercase tracking-widest font-label">Enterprise Access</span>
                <div className="h-[1px] flex-grow bg-outline-variant/20"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-3 bg-surface-container py-3 rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-colors font-label">
                  <span className="material-symbols-outlined text-[20px]">hub</span>
                  <span className="text-sm font-bold text-on-surface">SSO</span>
                </button>
                <button className="flex items-center justify-center gap-3 bg-surface-container py-3 rounded-xl border border-outline-variant/10 hover:bg-surface-container-high transition-colors font-label">
                  <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                  <span className="text-sm font-bold text-on-surface">Biometric</span>
                </button>
              </div>
            </section>
          )}
        </section>
      </main>

      <footer className="mt-12 py-8 flex flex-col items-center justify-center gap-4 text-on-surface-variant">
        <div className="flex items-center gap-6">
          <a className="text-xs font-semibold flex items-center gap-1 hover:text-on-surface transition-colors font-label" href="#">
            <span className="material-symbols-outlined text-[16px]">contact_support</span>
            Support
          </a>
          <div className="w-1 h-1 rounded-full bg-outline-variant/40"></div>
          <a className="text-xs font-semibold flex items-center gap-1 hover:text-on-surface transition-colors font-label" href="#">
            <span className="material-symbols-outlined text-[16px]">language</span>
            English
          </a>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low border border-outline-variant/10">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#90abff]"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant font-label">Network Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}
