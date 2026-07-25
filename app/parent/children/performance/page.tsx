'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Award, CheckCircle2, XCircle } from 'lucide-react';

interface Child { id: string; first_name: string; last_name: string | null; student_id: string; }

export default function ParentChildPerformancePage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => { const res = await api.get<{ children: Child[] }>('/api/v1/dashboard'); return res.data; },
  });
  const children = childrenData?.children || [];

  const { data: marksData, isLoading } = useQuery({
    queryKey: ['parent-child-performance', selectedChild],
    enabled: !!selectedChild,
    queryFn: async () => {
      const params = new URLSearchParams({ studentId: selectedChild, limit: '200' });
      const res = await api.get<Array<{
        obtained_marks: number | null;
        max_marks: number;
        percentage: number | null;
        is_pass: boolean;
        is_published: boolean;
        subject?: { name: string } | null;
        exam?: { name: string } | null;
      }>>(`/api/v1/marks?${params}`);
      return (res.data || []).filter(m => m.is_published && m.obtained_marks !== null);
    },
  });

  // Build chart data
  const subjectMap = new Map<string, { total: number; count: number }>();
  (marksData || []).forEach((m: any) => {
    const sub = m.subject?.name || 'Unknown';
    if (!subjectMap.has(sub)) subjectMap.set(sub, { total: 0, count: 0 });
    const entry = subjectMap.get(sub)!;
    entry.total += m.percentage || 0;
    entry.count += 1;
  });
  const chartData = Array.from(subjectMap.entries()).map(([name, s]) => ({ name, avg: Math.round(s.total / (s.count || 1)) }));

  const allMarks = marksData || [];
  const overallAvg = allMarks.length ? Math.round(allMarks.reduce((s: number, m: any) => s + (m.percentage || 0), 0) / allMarks.length) : 0;
  const passRate = allMarks.length ? Math.round((allMarks.filter((m: any) => m.is_pass).length / allMarks.length) * 100) : 0;

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Child Performance" description="Academic performance overview for your children" />

      <div className="mb-6">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} ({c.student_id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedChild ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p>Select a child to view performance</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div><p className="text-xs text-slate-500">Avg Score</p><p className="text-2xl font-bold text-slate-900">{overallAvg}%</p></div>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
                  <Award className="h-6 w-6 text-green-600" />
                </div>
                <div><p className="text-xs text-slate-500">Pass Rate</p><p className="text-2xl font-bold text-slate-900">{passRate}%</p></div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Subject-wise Average</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No published marks available</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip formatter={(v) => [`${v}%`, 'Average']} />
                    <Bar dataKey="avg" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardLayout>
  );
}
