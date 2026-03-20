// Route guard components for auth and role-based access control

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Zap } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center glow-primary">
          <Zap className="w-6 h-6 text-primary" />
        </div>
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading CivicSync...</p>
      </div>
    </div>
  );
}

/** Redirect to /auth if not logged in */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/** Redirect workers away from admin routes */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && profile.role !== 'admin') return <Navigate to="/worker" replace />;
  return <>{children}</>;
}

/** Redirect logged-in users to their dashboard */
export function RedirectIfLoggedIn({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/worker'} replace />;
  }
  return <>{children}</>;
}
