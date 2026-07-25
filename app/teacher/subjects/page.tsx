'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookMarked, Award, Target } from 'lucide-react';

interface SubjectInfo {
  subject_id: string;
  subject: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    max_marks: number;
    passing_marks: number;
    is_active: boolean;
  };
}

export default function TeacherSubjectsPage() {
  const api = useApi();

  const { data, isLoading } = useQuery<{ subjects: SubjectInfo[] }>({
    queryKey: ['teacher-subjects'],
    queryFn: async () => {
      const res = await api.get<{ batches: unknown[]; subjects: SubjectInfo[] }>('/api/v1/dashboard');
      return { subjects: res.data?.subjects || [] };
    },
  });

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader
        title="My Subjects"
        description="Subjects assigned to you for teaching"
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !data?.subjects || data.subjects.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <BookMarked className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No subjects assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Contact your institute admin to get subject assignments</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.subjects.map((ts) => (
            <Card key={ts.subject_id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{ts.subject.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{ts.subject.code}</Badge>
                  </div>
                  <StatusBadge status={ts.subject.is_active ? 'active' : 'inactive'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {ts.subject.description && (
                  <p className="text-sm text-slate-500">{ts.subject.description}</p>
                )}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    Max: {ts.subject.max_marks}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600">
                    <Target className="h-3.5 w-3.5 text-green-500" />
                    Pass: {ts.subject.passing_marks}
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
