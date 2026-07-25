'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { PageHeader, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

interface ParentDashboardData {
  children: Array<{ id: string; student_id: string; first_name: string; last_name: string }>;
}

export default function ParentDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<ParentDashboardData>({ queryKey: ['parent-dashboard'], queryFn: async () => { const res = await api.get<ParentDashboardData>('/api/v1/dashboard'); return res.data; } });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={parentNav} role="parent">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Parent Dashboard" description="Monitor your children's academic progress" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Linked Children" value={data.children.length} icon={GraduationCap} color="blue" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your Children</CardTitle>
        </CardHeader>
        <CardContent>
          {data.children.length === 0 ? (
            <p className="text-sm text-slate-500">No children linked to your account yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.children.map((child: ParentDashboardData['children'][number]) => (
                <Card key={child.id} className="border-slate-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold">
                      {child.first_name.charAt(0)}{child.last_name?.charAt(0) || ''}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{child.first_name} {child.last_name}</p>
                      <p className="text-xs text-slate-500">ID: {child.student_id}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
