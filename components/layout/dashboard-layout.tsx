'use client';

import { useState, useEffect, ReactNode, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { useApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Menu, LogOut, User as UserIcon, KeyRound, Bell, ChevronRight, GraduationCap,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import Link from 'next/link';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/lib/types';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const DashboardLayoutContext = createContext<boolean>(false);

export function DashboardLayout({
  children,
  navSections,
  role,
}: {
  children: ReactNode;
  navSections: NavSection[];
  role: Role;
}) {
  const isNestedLayout = useContext(DashboardLayoutContext);

  if (isNestedLayout) {
    return <>{children}</>;
  }

  return (
    <DashboardLayoutContext.Provider value={true}>
      <DashboardLayoutContent navSections={navSections} role={role}>
        {children}
      </DashboardLayoutContent>
    </DashboardLayoutContext.Provider>
  );
}

function DashboardLayoutContent({
  children,
  navSections,
  role,
}: {
  children: ReactNode;
  navSections: NavSection[];
  role: Role;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, instituteCode } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed');
      if (saved === 'true') setCollapsed(true);
      if (document.cookie.includes('is_impersonating=true')) {
        setIsImpersonating(true);
      }
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebar_collapsed', String(next));
      }
      return next;
    });
  }

  const userInitials = user
    ? `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase()
    : 'U';

  async function handleLogout() {
    await logout();
    router.push(role === 'super_admin' ? '/auth/super-admin/login' : '/auth/login');
  }

  function NavLinks({ isCollapsed = false, onNavigate }: { isCollapsed?: boolean; onNavigate?: () => void }) {
    return (
      <nav className={`flex flex-col gap-5 py-4 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed ? (
              <p className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">{section.title}</p>
            ) : (
              <div className="h-px bg-slate-200 my-2 mx-1" />
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/${role.replace('_', '-')}/dashboard` && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isCollapsed ? 'justify-center px-0 hover:bg-slate-100' : 'px-3'
                    } ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  }

  async function handleExitImpersonation() {
    try {
      const res = await fetch('/api/v1/auth/super-admin/exit-impersonation', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        document.cookie = 'is_impersonating=; Path=/; Max-Age=0; SameSite=Lax';
        window.location.href = data.data.redirectPath || '/super-admin/institutes';
      }
    } catch {
      window.location.href = '/super-admin/institutes';
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-slate-950 animate-ping" />
            <span>⚠️ Viewing Institute Dashboard as Super Admin (Impersonation Mode Active)</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExitImpersonation}
            className="h-7 bg-slate-950 text-white border-slate-800 hover:bg-slate-900 text-xs px-3 font-medium"
          >
            Exit Impersonation →
          </Button>
        </div>
      )}

      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex fixed inset-y-0 left-0 flex-col border-r border-slate-200 bg-white transition-all duration-300 ease-in-out z-40 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex items-center h-16 border-b border-slate-200 ${collapsed ? 'justify-center px-0' : 'justify-between px-5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-slate-900 text-base">EduManage</span>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <NavLinks isCollapsed={collapsed} />
        </div>

        <div className={`border-t border-slate-200 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">{userInitials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500 truncate">{ROLE_LABELS[role]}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content (Padded dynamically based on sidebar collapse) */}
      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-bold text-slate-900">EduManage</span>
                </div>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-1 text-sm text-slate-500">
              <span className="capitalize">{role.replace('_', ' ')}</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-slate-900 font-medium capitalize">
                {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {instituteCode && (
              <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                {instituteCode}
              </Badge>
            )}

            {/* Live Notifications & Announcement Dropdown */}
            <NotificationBellDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">{userInitials}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{user?.firstName}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs font-normal text-slate-500">{ROLE_LABELS[role]}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(`/${role.replace('_', '-')}/profile`)}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${role.replace('_', '-')}/change-password`)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NotificationBellDropdown() {
  const api = useApi();
  const queryClient = useQueryClient();

  const { data } = useQuery<{ notifications: any[]; unreadCount: number }>({
    queryKey: ['live-notifications-bell'],
    queryFn: async () => {
      try {
        const res = await api.get<any>('/api/v1/notifications/unread');
        return res?.data || { notifications: [], unreadCount: 0 };
      } catch {
        return { notifications: [], unreadCount: 0 };
      }
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  async function handleMarkAllRead() {
    try {
      await api.post('/api/v1/notifications/mark-read', {});
      queryClient.invalidateQueries({ queryKey: ['live-notifications-bell'] });
    } catch {}
  }

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow animate-pulse">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
            <Bell className="h-3.5 w-3.5 text-blue-600" />
            <span>Announcements & Alerts</span>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-medium text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500">
              No new announcements
            </div>
          ) : (
            notifications.map((n: any) => (
              <div
                key={n.id}
                className={`p-3 text-xs transition-colors hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/50 font-medium' : 'text-slate-600'}`}
              >
                <div className="font-semibold text-slate-900 mb-0.5">{n.title}</div>
                <div className="text-slate-600 text-[11px] line-clamp-2">{n.message}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DashboardLayoutSkeleton({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar Skeleton */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 flex-col w-64 border-r border-slate-200 bg-white z-40">
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">EduManage</span>
          </div>
          <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="h-3 w-16 bg-slate-200 rounded mb-3 ml-3 animate-pulse" />
            <div className="space-y-1.5">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80">
                  <div className="h-4 w-4 rounded bg-slate-200 animate-pulse flex-shrink-0" />
                  <div className="h-4 w-28 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="h-3 w-24 bg-slate-200 rounded mb-3 ml-3 animate-pulse" />
            <div className="space-y-1.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50/80">
                  <div className="h-4 w-4 rounded bg-slate-200 animate-pulse flex-shrink-0" />
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-3.5 w-24 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-64">
        {/* Topbar Skeleton */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-slate-100 animate-pulse lg:hidden" />
            <div className="hidden md:flex items-center gap-2">
              <div className="h-4 w-20 bg-slate-200 rounded animate-pulse" />
              <ChevronRight className="h-3 w-3 text-slate-300" />
              <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />
            <div className="h-8 w-8 rounded-full bg-blue-100 animate-pulse" />
          </div>
        </header>

        {/* Page Content Skeleton */}
        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children || (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 w-48 bg-slate-200 rounded-md" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3" />
                ))}
              </div>
              <div className="h-72 bg-white border border-slate-200 rounded-xl p-4 shadow-sm" />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
