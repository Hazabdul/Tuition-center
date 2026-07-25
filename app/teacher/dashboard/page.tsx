'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, BookMarked, GraduationCap, CalendarCheck, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

interface TeacherDashboardData {
  assignedBatches: number;
  assignedSubjects: number;
  totalStudents: number;
  todayAttendance: number;
  upcomingExams: Array<{ id: string; name: string; code: string; start_date: string | null; status: string; batch: { name: string } | null }>;
  recentMarks: Array<{ id: string; obtained_marks: number | null; subject: { name: string } | null; student: { first_name: string; last_name: string } | null }>;
  batches: Array<{ batch_id: string; batch: { id: string; name: string; code: string } }>;
  subjects: Array<{ subject_id: string; subject: { id: string; name: string; code: string } }>;
}

export default function TeacherDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<TeacherDashboardData>({ queryKey: ['teacher-dashboard'], queryFn: async () => { const res = await api.get<TeacherDashboardData>('/api/v1/dashboard'); return res.data; } });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={teacherNav} role="teacher">
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
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="Teacher Dashboard" description="Your teaching overview" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Assigned Batches" value={data.assignedBatches} icon={BookOpen} color="blue" />
        <StatCard title="Assigned Subjects" value={data.assignedSubjects} icon={BookMarked} color="green" />
        <StatCard title="Total Students" value={data.totalStudents} icon={GraduationCap} color="amber" />
        <StatCard title="Attendance Marked Today" value={data.todayAttendance} icon={CalendarCheck} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-slate-400" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming exams</p>
            ) : (
              <div className="space-y-3">
                {data.upcomingExams.map((e: TeacherDashboardData['upcomingExams'][number]) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.batch?.name || 'N/A'} · {e.start_date ? format(new Date(e.start_date), 'MMM d, yyyy') : 'TBD'}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Marks Entered</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentMarks.length === 0 ? (
              <p className="text-sm text-slate-500">No marks entered yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentMarks.map((m: TeacherDashboardData['recentMarks'][number]) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.student?.first_name} {m.student?.last_name}</p>
                      <p className="text-xs text-slate-500">{m.subject?.name || 'N/A'}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{m.obtained_marks ?? '-'}</span>
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
