'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Users } from 'lucide-react';

interface BatchPerformance {
  batchId: string;
  batchName: string;
  students: Array<{
    studentId: string;
    name: string;
    avgPercentage: number;
    passCount: number;
    failCount: number;
  }>;
  avgPercentage: number;
  passRate: number;
}

export default function TeacherPerformancePage() {
  const api = useApi();
  const [selectedBatch, setSelectedBatch] = useState<string>('all');

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard-data'],
    queryFn: async () => {
      const res = await api.get<{ batches: Array<{ batch_id: string; batch: { id: string; name: string } }> }>('/api/v1/dashboard');
      return res.data;
    },
  });

  const { data: marksData, isLoading } = useQuery({
    queryKey: ['teacher-performance', selectedBatch],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '200' });
      if (selectedBatch !== 'all') params.set('batchId', selectedBatch);
      const res = await api.get<Array<{
        obtained_marks: number;
        max_marks: number;
        percentage: number;
        is_pass: boolean;
        student: { first_name: string; last_name: string | null; student_id: string };
        subject: { name: string };
      }>>(`/api/v1/marks?${params}`);
      return res.data || [];
    },
  });

  // Build subject performance chart data
  const subjectMap = new Map<string, { total: number; count: number; pass: number }>();
  (marksData || []).forEach((m: any) => {
    const sub = m.subject?.name || 'Unknown';
    if (!subjectMap.has(sub)) subjectMap.set(sub, { total: 0, count: 0, pass: 0 });
    const entry = subjectMap.get(sub)!;
    entry.total += m.percentage || 0;
    entry.count += 1;
    if (m.is_pass) entry.pass += 1;
  });

  const chartData = Array.from(subjectMap.entries()).map(([name, stats]) => ({
    name,
    avgPercentage: Math.round(stats.total / (stats.count || 1)),
    passRate: Math.round((stats.pass / (stats.count || 1)) * 100),
  }));

  const overallAvg = marksData?.length
    ? Math.round(marksData.reduce((sum: number, m: any) => sum + (m.percentage || 0), 0) / marksData.length)
    : 0;
  const overallPass = marksData?.length
    ? Math.round((marksData.filter((m: any) => m.is_pass).length / marksData.length) * 100)
    : 0;

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="Student Performance" description="Performance overview for students in your batches" />

      <div className="mb-6 flex items-center gap-3">
        <Select value={selectedBatch} onValueChange={setSelectedBatch}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Batches</SelectItem>
            {(dashboardData?.batches || []).map((tb: any) => (
              <SelectItem key={tb.batch_id} value={tb.batch_id}>{tb.batch.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Avg Score</p>
              <p className="text-2xl font-bold text-slate-900">{overallAvg}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Pass Rate</p>
              <p className="text-2xl font-bold text-slate-900">{overallPass}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Subject-wise Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 bg-slate-50 rounded animate-pulse" />
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400">
              <p>No marks data available</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgPercentage" name="Avg %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passRate" name="Pass %" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
