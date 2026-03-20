// Admin Sidebar navigation with collapsible support

import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, ClipboardList, BarChart3,
  Settings, LogOut, Zap, ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Dashboard',   url: '/admin',           icon: LayoutDashboard },
  { title: 'Workers',     url: '/admin/workers',   icon: Users },
  { title: 'Tasks',       url: '/admin/tasks',     icon: ClipboardList },
  { title: 'Analytics',   url: '/admin/analytics', icon: BarChart3 },
  { title: 'Settings',    url: '/admin/settings',  icon: Settings },
];

export function AdminSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const { profile, signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
    >
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0 glow-primary">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <span className="text-base font-bold text-foreground tracking-tight">
                Civic<span className="text-primary">Sync</span>
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={toggleSidebar}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map(({ title, url, icon: Icon }) => {
                const isActive = location.pathname === url ||
                  (url !== '/admin' && location.pathname.startsWith(url));
                return (
                  <SidebarMenuItem key={title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={url}
                        end={url === '/admin'}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/15 text-primary border border-primary/20'
                            : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                        )}
                        activeClassName=""
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-primary' : '')} />
                        {!collapsed && <span>{title}</span>}
                        {!collapsed && isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 py-3 border-t border-sidebar-border">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-medium text-foreground truncate">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={signOut}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all duration-200',
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
