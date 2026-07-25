'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { PageHeader, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadialBarChart, RadialBar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { TrendingUp, Award, CheckCircle2, XCircle } from 'lucide-react';

interface PerformanceData {
  overallAvg: number;
  overallPassRate: number;
  subjectPerformance: Array<{
    subject: string;
    avg: number;
    pass: boolean;
  }>;
  examResults: Array<{
    examName: string;
    totalMarks: number;
    obtainedMarks: number;
    percentage: number;
    grade: string;
    result: string;
  }>;
}

export default function StudentPerformancePage() {
  const api = useApi();

  const { data, isLoading } = useQuery<PerformanceData>({
    queryKey: ['student-performance'],
    queryFn: async () => {
      // Fetch marks to compute performance locally
      const res = await api.get<Array<{
        obtained_marks: number | null;
        max_marks: number;
        percentage: number | null;
        is_pass: boolean;
        is_published: boolean;
        subject?: { name: string } | null;
        exam?: { name: string } | null;
      }>>('/api/v1/marks/student/me');

      const marks = (res.data || []).filter(m => m.is_published && m.obtained_marks !== null);

      // Subject performance
      const subjectMap = new Map<string, { total: number; count: number; passCount: number }>();
      marks.forEach(m => {
        const sub = m.subject?.name || 'Unknown';
        if (!subjectMap.has(sub)) subjectMap.set(sub, { total: 0, count: 0, passCount: 0 });
        const entry = subjectMap.get(sub)!;
        entry.total += m.percentage || 0;
        entry.count += 1;
        if (m.is_pass) entry.passCount += 1;
      });

      const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
        subject,
        avg: Math.round(stats.total / (stats.count || 1)),
        pass: stats.passCount === stats.count,
      }));

      // Exam results
      const examMap = new Map<string, { total: number; obtained: number; count: number; pass: number }>();
      marks.forEach(m => {
        const exam = m.exam?.name || 'Unknown';
        if (!examMap.has(exam)) examMap.set(exam, { total: 0, obtained: 0, count: 0, pass: 0 });
        const entry = examMap.get(exam)!;
        entry.total += m.max_marks;
        entry.obtained += m.obtained_marks || 0;
        entry.count += 1;
        if (m.is_pass) entry.pass += 1;
      });

      const examResults = Array.from(examMap.entries()).map(([examName, stats]) => {
        const pct = stats.total > 0 ? Math.round((stats.obtained / stats.total) * 100) : 0;
        let grade = 'F';
        if (pct >= 90) grade = 'A+';
        else if (pct >= 80) grade = 'A';
        else if (pct >= 70) grade = 'B';
        else if (pct >= 60) grade = 'C';
        else if (pct >= 50) grade = 'D';
        return { examName, totalMarks: stats.total, obtainedMarks: stats.obtained, percentage: pct, grade, result: pct >= 40 ? 'Pass' : 'Fail' };
      });

      const overallAvg = marks.length ? Math.round(marks.reduce((s, m) => s + (m.percentage || 0), 0) / marks.length) : 0;
      const overallPassRate = marks.length ? Math.round((marks.filter(m => m.is_pass).length / marks.length) * 100) : 0;

      return { overallAvg, overallPassRate, subjectPerformance, examResults };
    },
  });

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="Academic Performance" description="Your subject and exam performance overview" />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard title="Overall Score" value={`${data?.overallAvg || 0}%`} icon={TrendingUp} color="blue" />
        <StatCard title="Pass Rate" value={`${data?.overallPassRate || 0}%`} icon={Award} color="green" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Subject-wise Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.subjectPerformance.length ? (
                <p className="text-sm text-slate-500 text-center py-8">No published marks available</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.subjectPerformance} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Avg Score']} />
                    <Bar dataKey="avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Exam-wise Results</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.examResults.length ? (
                <p className="text-sm text-slate-500 text-center py-8">No published results available</p>
              ) : (
                <div className="space-y-3">
                  {data.examResults.map((exam: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{exam.examName}</p>
                        <p className="text-xs text-slate-500">{exam.obtainedMarks}/{exam.totalMarks} marks</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-900">{exam.grade}</span>
                        <span className="text-sm font-medium text-slate-600">{exam.percentage}%</span>
                        {exam.result === 'Pass' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
