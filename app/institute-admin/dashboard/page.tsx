'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Users, UserCheck, BookOpen, BookMarked, CalendarCheck, DollarSign, TrendingUp, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';

interface InstituteAdminDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  totalBatches: number;
  totalSubjects: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  totalFeesAssigned: number;
  totalFeesCollected: number;
  pendingFees: number;
  overdueFees: number;
  recentPayments: Array<{ id: string; amount_paid?: number; amountPaid?: number; payment_date?: string; paymentDate?: string; receipt_number?: string; receiptNumber?: string; student: { first_name?: string; last_name?: string; firstName?: string; lastName?: string } | null }>;
  upcomingExams: Array<{ id: string; name: string; code: string; start_date?: string | null; startDate?: string | null; status: string; batch: { name: string } | null }>;
  recentActivities: Array<{ id: string; action: string; created_at?: string; createdAt?: string; user: { first_name?: string; last_name?: string; firstName?: string; lastName?: string } | null }>;
}

function formatSafeDate(dateVal: any, pattern: string): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return format(d, pattern);
}

export default function InstituteAdminDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<InstituteAdminDashboardData, Error>({
    queryKey: ['institute-admin-dashboard'],
    queryFn: async () => {
      const res = await api.get<InstituteAdminDashboardData>('/api/v1/dashboard');
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const recentPayments = data.recentPayments || [];
  const upcomingExams = data.upcomingExams || [];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Institute Dashboard" description="Overview of your institute's operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Students" value={data.totalStudents || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Total Teachers" value={data.totalTeachers || 0} icon={Users} color="green" />
        <StatCard title="Total Parents" value={data.totalParents || 0} icon={UserCheck} color="amber" />
        <StatCard title="Total Batches" value={data.totalBatches || 0} icon={BookOpen} color="purple" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Subjects" value={data.totalSubjects || 0} icon={BookMarked} color="gray" />
        <StatCard title="Present Today" value={data.presentToday || 0} icon={CalendarCheck} color="green" />
        <StatCard title="Absent Today" value={data.absentToday || 0} icon={CalendarCheck} color="red" />
        <StatCard title="Late Today" value={data.lateToday || 0} icon={CalendarCheck} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Fees Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600 font-medium">Total Assigned</p>
                <p className="text-xl font-bold text-blue-900 mt-1">{(data.totalFeesAssigned || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-xs text-green-600 font-medium">Collected</p>
                <p className="text-xl font-bold text-green-900 mt-1">{(data.totalFeesCollected || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-600 font-medium">Pending</p>
                <p className="text-xl font-bold text-amber-900 mt-1">{(data.pendingFees || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <p className="text-xs text-red-600 font-medium">Overdue</p>
                <p className="text-xl font-bold text-red-900 mt-1">{(data.overdueFees || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-500" />
              Today's Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-green-50">
                <p className="text-xs text-green-600 font-medium">Present</p>
                <p className="text-xl font-bold text-green-900 mt-1">{data.presentToday || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <p className="text-xs text-red-600 font-medium">Absent</p>
                <p className="text-xl font-bold text-red-900 mt-1">{data.absentToday || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <p className="text-xs text-amber-600 font-medium">Late</p>
                <p className="text-xl font-bold text-amber-900 mt-1">{data.lateToday || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <p className="text-xs text-blue-600 font-medium">On Leave</p>
                <p className="text-xl font-bold text-blue-900 mt-1">{data.onLeaveToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-slate-400" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-sm text-slate-500">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((p) => {
                  const studentName = p.student
                    ? `${p.student.first_name || p.student.firstName || ''} ${p.student.last_name || p.student.lastName || ''}`.trim()
                    : 'Unknown Student';
                  const receipt = p.receipt_number || p.receiptNumber || 'N/A';
                  const amount = p.amount_paid ?? p.amountPaid ?? 0;
                  const payDate = p.payment_date || p.paymentDate;
                  return (
                    <div key={p.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{studentName}</p>
                        <p className="text-xs text-slate-500">{receipt} · {formatSafeDate(payDate, 'MMM d, yyyy')}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">₹{Number(amount).toLocaleString()}</span>
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
              <ClipboardList className="h-5 w-5 text-slate-400" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingExams.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming exams</p>
            ) : (
              <div className="space-y-3">
                {upcomingExams.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {e.batch?.name || 'N/A'} · {formatSafeDate(e.start_date || e.startDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
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
