'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';

interface Child { id: string; first_name: string; last_name: string | null; student_id: string; }
interface ExamOption { id: string; name: string; code: string; status: string; }
interface MarkRow {
  id: string;
  subject_name: string;
  max_marks: number;
  obtained_marks: number | null;
  grade: string | null;
  percentage: number | null;
  is_pass: boolean;
  remarks: string | null;
}

export default function ParentChildMarksPage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => { const res = await api.get<{ children: Child[] }>('/api/v1/dashboard'); return res.data; },
  });
  const children = childrenData?.children || [];

  const { data: exams } = useQuery<ExamOption[]>({
    queryKey: ['parent-exams-list'],
    enabled: !!selectedChild,
    queryFn: async () => { const res = await api.get<ExamOption[]>('/api/v1/exams?status=published&limit=50'); return res.data || []; },
  });

  const { data: markSheetData, isLoading } = useQuery({
    queryKey: ['parent-child-marksheet', selectedChild, selectedExam],
    enabled: !!selectedChild && !!selectedExam,
    queryFn: async () => {
      const res = await api.get<{
        marks: MarkRow[];
        totalMarks: number;
        obtainedMarks: number;
        percentage: number;
        grade: string;
        result: string;
      }>(`/api/v1/marks/student/me/marksheet/${selectedExam}?studentId=${selectedChild}`);
      return res.data;
    },
  });

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Child Marks" description="View published exam marks for your children" />

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <Select value={selectedChild} onValueChange={(v) => { setSelectedChild(v); setSelectedExam(''); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} ({c.student_id})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedChild && (
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select exam" />
            </SelectTrigger>
            <SelectContent>
              {(exams || []).map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selectedChild || !selectedExam ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a child and exam to view marks</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      ) : !markSheetData ? (
        <Card><CardContent className="py-12 text-center text-slate-400">Results not available yet</CardContent></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 font-medium">Total Marks</p>
              <p className="text-xl font-bold text-blue-900">{markSheetData.obtainedMarks}/{markSheetData.totalMarks}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 font-medium">Percentage</p>
              <p className="text-xl font-bold text-purple-900">{markSheetData.percentage}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">Grade</p>
              <p className="text-xl font-bold text-amber-900">{markSheetData.grade}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${markSheetData.result === 'Pass' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-medium ${markSheetData.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>Result</p>
              <p className={`text-xl font-bold ${markSheetData.result === 'Pass' ? 'text-green-900' : 'text-red-900'}`}>{markSheetData.result}</p>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Subject</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Max</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Obtained</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">%</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Grade</th>
                    <th className="text-center px-4 py-3 font-medium text-slate-600">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {markSheetData.marks.map((mark: any) => (
                    <tr key={mark.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{mark.subject_name}</td>
                      <td className="px-4 py-3 text-center">{mark.max_marks}</td>
                      <td className="px-4 py-3 text-center font-semibold">{mark.obtained_marks ?? '—'}</td>
                      <td className="px-4 py-3 text-center">{mark.percentage !== null ? `${mark.percentage}%` : '—'}</td>
                      <td className="px-4 py-3 text-center font-bold">{mark.grade || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mark.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {mark.is_pass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
