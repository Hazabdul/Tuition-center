'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, Users, BookOpen, Calendar } from 'lucide-react';

interface StudentBatchData {
  batches: Array<{
    id: string;
    batch_id: string;
    batch: {
      id: string;
      name: string;
      code: string;
      academic_year: string | null;
      start_date: string | null;
      end_date: string | null;
      start_time: string | null;
      end_time: string | null;
      capacity: number;
      description: string | null;
      is_active: boolean;
    };
  }>;
}

export default function StudentBatchPage() {
  const api = useApi();

  const { data, isLoading } = useQuery<StudentBatchData>({
    queryKey: ['student-batch'],
    queryFn: async () => {
      const res = await api.get<StudentBatchData>('/api/v1/students/my-batch');
      return res.data;
    },
  });

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="My Batch" description="Your enrolled batches and schedule" />

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : !data?.batches || data.batches.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Not enrolled in any batch</p>
            <p className="text-sm text-slate-400 mt-1">Contact your institute admin for batch enrollment</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.batches.map((sb: any) => (
            <Card key={sb.batch_id} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{sb.batch.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{sb.batch.code}</Badge>
                  </div>
                  <StatusBadge status={sb.batch.is_active ? 'active' : 'inactive'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sb.batch.description && (
                  <p className="text-sm text-slate-500">{sb.batch.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {sb.batch.academic_year && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Academic Year</p>
                        <p className="text-sm font-medium text-slate-700">{sb.batch.academic_year}</p>
                      </div>
                    </div>
                  )}
                  {(sb.batch.start_time || sb.batch.end_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Timing</p>
                        <p className="text-sm font-medium text-slate-700">{sb.batch.start_time} — {sb.batch.end_time}</p>
                      </div>
                    </div>
                  )}
                  {sb.batch.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Start Date</p>
                        <p className="text-sm font-medium text-slate-700">{sb.batch.start_date}</p>
                      </div>
                    </div>
                  )}
                  {sb.batch.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">End Date</p>
                        <p className="text-sm font-medium text-slate-700">{sb.batch.end_date}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-xs text-slate-400">Capacity</p>
                      <p className="text-sm font-medium text-slate-700">{sb.batch.capacity} students</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
