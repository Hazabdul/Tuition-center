'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, CalendarX, Clock, CalendarOff, DollarSign, ClipboardList, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface StudentDashboardData {
  student: { id: string; student_id: string; first_name: string; last_name: string };
  attendancePct: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  pendingFees: number;
  lastPayment: { id: string; amount_paid: number; payment_date: string; receipt_number: string } | null;
  upcomingExams: Array<{ id: string; name: string; code: string; start_date: string | null; end_date: string | null }>;
  publishedMarks: Array<{ id: string; obtained_marks: number | null; grade: string | null; percentage: number | null; subject: { name: string } | null; exam: { name: string } | null }>;
}

export default function StudentDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<StudentDashboardData>({ queryKey: ['student-dashboard'], queryFn: async () => { const res = await api.get<StudentDashboardData>('/api/v1/dashboard'); return res.data; } });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={studentNav} role="student">
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
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title={`Welcome, ${data.student.first_name}!`} description={`Student ID: ${data.student.student_id}`} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Attendance" value={`${data.attendancePct}%`} icon={CalendarCheck} color="green" description={`${data.presentDays} days present`} />
        <StatCard title="Absent Days" value={data.absentDays} icon={CalendarX} color="red" />
        <StatCard title="Late Days" value={data.lateDays} icon={Clock} color="amber" />
        <StatCard title="Pending Fees" value={data.pendingFees.toLocaleString()} icon={DollarSign} color="blue" />
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
                {data.upcomingExams.map((e: StudentDashboardData['upcomingExams'][number]) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {e.start_date ? format(new Date(e.start_date), 'MMM d, yyyy') : 'TBD'}
                        {e.end_date ? ` – ${format(new Date(e.end_date), 'MMM d, yyyy')}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.publishedMarks.length === 0 ? (
              <p className="text-sm text-slate-500">No published results yet</p>
            ) : (
              <div className="space-y-3">
                {data.publishedMarks.map((m: StudentDashboardData['publishedMarks'][number]) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.subject?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{m.exam?.name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{m.obtained_marks ?? '-'}</p>
                      {m.grade && <span className="text-xs text-slate-500">Grade: {m.grade}</span>}
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
