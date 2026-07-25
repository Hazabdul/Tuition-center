'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { GraduationCap, Users, BookOpen, CreditCard, CalendarCheck, ClipboardList, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const PIE_COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

interface ClassAnalyticsData {
  rankers: { rank: number; studentName: string; studentCode: string; totalObtained: number; totalMax: number; overallPercentage: number }[];
  subjectMatrix: { subjectName: string; subjectCode: string; passPercentage: number; avgPercentage: number; totalExaminees: number }[];
}

export default function InstituteAdminReportsPage() {
  const api = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ['institute-admin-reports'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/dashboard');
      return res.data;
    },
  });

  const { data: analytics } = useQuery<ClassAnalyticsData>({
    queryKey: ['institute-class-analytics'],
    queryFn: async () => {
      const res = await api.get<ClassAnalyticsData>('/api/v1/reports/class-analytics');
      return res.data;
    },
  });

  const attendanceData = [
    { name: 'Present', value: data?.presentToday || 0 },
    { name: 'Absent', value: data?.absentToday || 0 },
    { name: 'Late', value: data?.lateToday || 0 },
    { name: 'Leave', value: data?.onLeaveToday || 0 },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Institute Analytics & Academic Reports" description="Comprehensive academic performance, attendance, and fee collection metrics" />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Students" value={data?.totalStudents || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Teachers" value={data?.totalTeachers || 0} icon={Users} color="green" />
        <StatCard title="Parents" value={data?.totalParents || 0} icon={Users} color="purple" />
        <StatCard title="Batches" value={data?.totalBatches || 0} icon={BookOpen} color="amber" />
        <StatCard title="Subjects" value={data?.totalSubjects || 0} icon={ClipboardList} color="blue" />
        <StatCard title="Today Present" value={data?.presentToday || 0} icon={CalendarCheck} color="green" />
      </div>

      {/* Class Rankers Leaderboard & Subject Pass Rate Matrix */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Top 5 Batch Rankers */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span>Top Academic Rankers Leaderboard</span>
            </CardTitle>
            <CardDescription>Highest scoring students across published examinations</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.rankers || []).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No published exam scores available</p>
            ) : (
              <div className="space-y-3">
                {(analytics?.rankers || []).map((r: any) => (
                  <div key={r.rank} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-xs ${
                        r.rank === 1 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        r.rank === 2 ? 'bg-slate-200 text-slate-800' :
                        r.rank === 3 ? 'bg-amber-700/10 text-amber-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{r.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{r.studentName}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.studentCode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-sm text-blue-600">{r.overallPercentage}%</span>
                      <p className="text-[11px] text-slate-400">{r.totalObtained} / {r.totalMax} Marks</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subject Pass Rate Bar Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              <span>Subject Pass Rate Matrix (%)</span>
            </CardTitle>
            <CardDescription>Pass percentages by subject area</CardDescription>
          </CardHeader>
          <CardContent>
            {(analytics?.subjectMatrix || []).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">No subject performance data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics?.subjectMatrix || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="subjectCode" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(val: number) => [`${val}%`, 'Pass Rate']} />
                  <Bar dataKey="passPercentage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Today Attendance */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="h-52 bg-slate-50 rounded animate-pulse" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={attendanceData.filter(d => d.value > 0)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {attendanceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Fee Collection */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Fee Collection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="h-52 bg-slate-50 rounded animate-pulse" /> : (
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="h-3 w-3 rounded-sm bg-green-500" />
                    Collected
                  </div>
                  <span className="font-semibold text-green-700">{formatCurrency(data?.totalFeesCollected || 0)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: data?.totalFeesAssigned ? `${Math.min(100, Math.round((data.totalFeesCollected / data.totalFeesAssigned) * 100))}%` : '0%' }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Pending</span>
                  <span className="text-sm font-medium text-amber-700">{formatCurrency(data?.pendingFees || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Overdue</span>
                  <span className="text-sm font-medium text-red-700">{formatCurrency(data?.overdueFees || 0)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Total Assigned</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(data?.totalFeesAssigned || 0)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
