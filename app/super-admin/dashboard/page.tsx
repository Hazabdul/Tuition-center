'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, GraduationCap, UserCheck, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SuperAdminDashboardData {
  totalInstitutes: number;
  activeInstitutes: number;
  trialInstitutes: number;
  suspendedInstitutes: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalUsers: number;
  recentInstitutes: Array<{ id: string; name: string; code: string; status: string; created_at: string }>;
  expiringSubs: Array<{ id: string; status: string; expiry_date: string; institute: { name: string; code: string } }>;
  recentActivities: Array<{ id: string; action: string; created_at: string; user: { first_name: string; last_name: string } | null }>;
}

export default function SuperAdminDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<SuperAdminDashboardData>({ queryKey: ['super-admin-dashboard'], queryFn: async () => { const res = await api.get<SuperAdminDashboardData>('/api/v1/dashboard'); return res.data; } });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={superAdminNav} role="super_admin">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Platform Dashboard" description="Overview of all institutes and platform activity" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Institutes" value={data.totalInstitutes} icon={Building2} color="blue" description={`${data.activeInstitutes} active`} />
        <StatCard title="Total Students" value={data.totalStudents} icon={GraduationCap} color="green" />
        <StatCard title="Total Teachers" value={data.totalTeachers} icon={Users} color="amber" />
        <StatCard title="Total Parents" value={data.totalParents} icon={UserCheck} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Platform Users" value={data.totalUsers} icon={Users} color="gray" />
        <StatCard title="Active Institutes" value={data.activeInstitutes} icon={TrendingUp} color="green" />
        <StatCard title="Trial Institutes" value={data.trialInstitutes} icon={Building2} color="blue" />
        <StatCard title="Suspended" value={data.suspendedInstitutes} icon={AlertCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recently Added Institutes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentInstitutes.length === 0 ? (
              <p className="text-sm text-slate-500">No institutes yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentInstitutes.map((inst: SuperAdminDashboardData['recentInstitutes'][number]) => (
                  <div key={inst.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inst.name}</p>
                      <p className="text-xs text-slate-500">{inst.code} · {format(new Date(inst.created_at), 'MMM d, yyyy')}</p>
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Expiring Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            {data.expiringSubs.length === 0 ? (
              <p className="text-sm text-slate-500">No expiring subscriptions</p>
            ) : (
              <div className="space-y-3">
                {data.expiringSubs.map((sub: SuperAdminDashboardData['expiringSubs'][number]) => (
                  <div key={sub.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{sub.institute?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{sub.institute?.code} · Expires {sub.expiry_date ? format(new Date(sub.expiry_date), 'MMM d, yyyy') : 'N/A'}</p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-slate-400" />
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivities.map((act: SuperAdminDashboardData['recentActivities'][number]) => (
                  <div key={act.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-900">{act.action}</p>
                      <p className="text-xs text-slate-500">
                        {act.user ? `${act.user.first_name} ${act.user.last_name}` : 'System'} · {format(new Date(act.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
