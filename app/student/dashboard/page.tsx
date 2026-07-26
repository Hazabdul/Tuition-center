'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { StatCard, PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck, CalendarX, Clock, DollarSign, ClipboardList, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface StudentDashboardData {
  student: { id: string; student_id?: string; studentId?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string };
  attendancePct: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  pendingFees: number;
  lastPayment: { id: string; amount_paid?: number; amountPaid?: number; payment_date?: string; paymentDate?: string; receipt_number?: string; receiptNumber?: string } | null;
  upcomingExams: Array<{ id: string; name: string; code: string; start_date?: string | null; startDate?: string | null; end_date?: string | null; endDate?: string | null }>;
  publishedMarks: Array<{ id: string; obtained_marks?: number | null; obtainedMarks?: number | null; grade?: string | null; percentage?: number | null; subject: { name: string } | null; exam: { name: string } | null }>;
}

function formatSafeDate(dateVal: any, pattern: string): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return format(d, pattern);
}

export default function StudentDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<StudentDashboardData>({
    queryKey: ['student-dashboard'],
    queryFn: async () => {
      const res = await api.get<StudentDashboardData>('/api/v1/dashboard');
      return res.data;
    },
  });

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

  const studentName = data.student
    ? (data.student.first_name || data.student.firstName || 'Student')
    : 'Student';
  const studentCode = data.student
    ? (data.student.student_id || data.student.studentId || '')
    : '';

  const upcomingExams = data.upcomingExams || [];
  const publishedMarks = data.publishedMarks || [];

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title={`Welcome, ${studentName}!`} description={studentCode ? `Student ID: ${studentCode}` : 'Student Portal'} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Attendance" value={`${data.attendancePct || 0}%`} icon={CalendarCheck} color="green" description={`${data.presentDays || 0} days present`} />
        <StatCard title="Absent Days" value={data.absentDays || 0} icon={CalendarX} color="red" />
        <StatCard title="Late Days" value={data.lateDays || 0} icon={Clock} color="amber" />
        <StatCard title="Pending Fees" value={(data.pendingFees || 0).toLocaleString()} icon={DollarSign} color="blue" />
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
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming exams</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((e) => {
                  const startDateStr = formatSafeDate(e.start_date || e.startDate, 'MMM d, yyyy');
                  const endDateStr = formatSafeDate(e.end_date || e.endDate, 'MMM d, yyyy');
                  return (
                    <div key={e.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{e.name}</p>
                        <p className="text-xs text-slate-500">
                          {startDateStr || 'TBD'}
                          {endDateStr ? ` – ${endDateStr}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
            {publishedMarks.length === 0 ? (
              <p className="text-sm text-slate-500">No published results yet</p>
            ) : (
              <div className="space-y-3">
                {publishedMarks.map((m) => (
                  <div key={m.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.subject?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{m.exam?.name || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{m.obtained_marks ?? m.obtainedMarks ?? '-'}</p>
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
