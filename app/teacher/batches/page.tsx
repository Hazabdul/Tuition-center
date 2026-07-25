'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Clock } from 'lucide-react';

interface BatchInfo {
  batch_id: string;
  batch: {
    id: string;
    name: string;
    code: string;
    academic_year: string | null;
    start_time: string | null;
    end_time: string | null;
    capacity: number;
    is_active: boolean;
  };
  studentCount?: number;
}

export default function TeacherBatchesPage() {
  const api = useApi();

  const { data, isLoading } = useQuery<{ batches: BatchInfo[] }>({
    queryKey: ['teacher-batches'],
    queryFn: async () => {
      const res = await api.get<{ batches: BatchInfo[]; subjects: unknown[] }>('/api/v1/dashboard');
      return { batches: res.data?.batches || [] };
    },
  });

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader
        title="My Batches"
        description="Batches assigned to you for teaching"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data?.batches || data.batches.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No batches assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Contact your institute admin to get batch assignments</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.batches.map((tb) => (
            <Card key={tb.batch_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{tb.batch.name}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{tb.batch.code}</p>
                  </div>
                  <StatusBadge status={tb.batch.is_active ? 'active' : 'inactive'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {tb.batch.academic_year && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                    Academic Year: {tb.batch.academic_year}
                  </div>
                )}
                {(tb.batch.start_time || tb.batch.end_time) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    {tb.batch.start_time} — {tb.batch.end_time}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  Capacity: {tb.batch.capacity} students
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
