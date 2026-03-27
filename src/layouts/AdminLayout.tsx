// Admin Layout — wraps all admin pages with sidebar + top bar

import { useAuth } from '@/contexts/AuthContext';
import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export default function AdminLayout() {
  const { profile, signOut } = useAuth();

  const SidebarContentArea = () => (
    <>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
          <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white dark:text-slate-50 font-headline">CivicSync</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Executive Control</p>
        </div>
      </div>
      
      <nav className="flex flex-col gap-y-2 mt-4 font-body">
        <a href="/admin" className="flex items-center gap-3 py-3 px-4 rounded-xl text-[#b4c5ff] font-bold border-r-2 border-[#b4c5ff] hover:bg-[#171f33] transition-all duration-200">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-sm font-medium tracking-wide">Dashboard</span>
        </a>
        <a href="/admin/workers" className="flex items-center gap-3 py-3 px-4 rounded-xl text-[#a1a1aa] hover:text-slate-100 hover:bg-[#171f33] transition-all duration-200">
          <span className="material-symbols-outlined">group</span>
          <span className="text-sm font-medium tracking-wide">Workers</span>
        </a>
        <a href="/admin/tasks" className="flex items-center gap-3 py-3 px-4 rounded-xl text-[#a1a1aa] hover:text-slate-100 hover:bg-[#171f33] transition-all duration-200">
          <span className="material-symbols-outlined">assignment</span>
          <span className="text-sm font-medium tracking-wide">Tasks</span>
        </a>
        <a href="/admin/analytics" className="flex items-center gap-3 py-3 px-4 rounded-xl text-[#a1a1aa] hover:text-slate-100 hover:bg-[#171f33] transition-all duration-200">
          <span className="material-symbols-outlined">insights</span>
          <span className="text-sm font-medium tracking-wide">Analytics</span>
        </a>
        <a href="/admin/settings" className="flex items-center gap-3 py-3 px-4 rounded-xl text-[#a1a1aa] hover:text-slate-100 hover:bg-[#171f33] transition-all duration-200">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm font-medium tracking-wide">Settings</span>
        </a>
      </nav>

      <div className="mt-auto p-4 rounded-xl bg-surface-container-low/50 font-body">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? 'A'}
            </span>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">{profile?.full_name ?? 'Admin User'}</p>
            <p className="text-[10px] text-slate-500">System Architect</p>
          </div>
        </div>
        <button onClick={signOut} className="w-full py-2 bg-surface-container-highest text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:text-white transition-colors">Sign Out</button>
      </div>
    </>
  );

  return (
    <div className="bg-surface text-on-surface antialiased overflow-x-hidden min-h-screen flex w-full">
      {/* SideNavBar - Desktop */}
      <aside className="hidden md:flex bg-slate-900 dark:bg-[#131b2e] h-screen w-64 fixed left-0 top-0 flex-col py-8 px-6 gap-y-6 z-50 tonal-shift-no-border">
        <SidebarContentArea />
      </aside>

      {/* Main Content Shell */}
      <main className="w-full md:ml-64 flex-1 min-h-screen relative">
        {/* TopNavBar */}
        <header className="fixed top-0 left-0 md:left-64 right-0 w-full md:w-[calc(100%-16rem)] h-16 dark:bg-[#0b1326]/80 backdrop-blur-xl flex justify-between items-center px-4 md:px-8 z-40 shadow-none tonal-transition-no-border">
          <div className="flex items-center gap-4 md:gap-6">
            <Sheet>
              <SheetTrigger asChild>
                <button className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white transition-opacity">
                  <Menu className="w-6 h-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-none bg-slate-900 dark:bg-[#131b2e] flex flex-col py-8 px-6 gap-y-6">
                <SidebarContentArea />
              </SheetContent>
            </Sheet>

            <h2 className="text-lg md:text-xl font-black text-slate-100 font-headline truncate">CivicSync Admin</h2>
            <div className="relative focus-within:ring-2 focus-within:ring-blue-500/20 rounded-lg hidden sm:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
              <input 
                className="bg-surface-container-highest/50 border-none rounded-lg pl-10 pr-4 py-1.5 text-xs text-slate-300 w-48 md:w-64 focus:ring-0 font-body" 
                placeholder="Search operational data..." 
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-slate-400 hover:text-white transition-opacity">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-px h-6 bg-outline-variant/20 mx-1 md:mx-2 hidden sm:block"></div>
            <button className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-opacity">
              <span className="text-xs font-semibold text-slate-200 hidden sm:block">Admin Profile</span>
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-base">account_circle</span>
              </div>
            </button>
          </div>
        </header>

        {/* Canvas Area */}
        <div className="pt-24 pb-12 px-4 md:px-10 max-w-[1600px] mx-auto space-y-12 animate-fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
