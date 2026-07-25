'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { PageHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import Link from 'next/link';

interface ExamInfo {
  id: string;
  name: string;
  code: string;
  status: string;
}

export default function StudentMarksPage() {
  const api = useApi();
  const [selectedExam, setSelectedExam] = useState<string>('');

  const { data: exams } = useQuery<ExamInfo[]>({
    queryKey: ['student-exams-list'],
    queryFn: async () => {
      const res = await api.get<ExamInfo[]>('/api/v1/exams?status=published');
      return res.data || [];
    },
  });

  const { data: marksData, isLoading } = useQuery({
    queryKey: ['student-marks-for-exam', selectedExam],
    enabled: !!selectedExam,
    queryFn: async () => {
      const res = await api.get<{
        student: { first_name: string; last_name: string | null; student_id: string; admission_number: string };
        exam: { name: string; code: string; academic_year: string | null };
        batch: { name: string } | null;
        marks: Array<{
          id: string;
          subject_name: string;
          max_marks: number;
          obtained_marks: number | null;
          grade: string | null;
          percentage: number | null;
          is_pass: boolean;
          remarks: string | null;
        }>;
        totalMarks: number;
        obtainedMarks: number;
        percentage: number;
        grade: string;
        result: string;
      }>(`/api/v1/marks/student/me/marksheet/${selectedExam}`);
      return res.data;
    },
  });

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="My Marks" description="View and download your mark sheets">
        {selectedExam && marksData && (
          <Link href={`/student/marks/marksheet/${selectedExam}`} target="_blank">
            <Button size="sm" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print Mark Sheet
            </Button>
          </Link>
        )}
      </PageHeader>

      <div className="mb-6">
        <Select value={selectedExam} onValueChange={setSelectedExam}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select an exam to view marks" />
          </SelectTrigger>
          <SelectContent>
            {(exams || []).map((exam) => (
              <SelectItem key={exam.id} value={exam.id}>{exam.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedExam ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            Select an exam above to view your marks
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      ) : !marksData ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center text-slate-400">
            No marks found for this exam
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600 font-medium">Total Marks</p>
              <p className="text-xl font-bold text-blue-900">{marksData.obtainedMarks}/{marksData.totalMarks}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <p className="text-xs text-purple-600 font-medium">Percentage</p>
              <p className="text-xl font-bold text-purple-900">{marksData.percentage}%</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="text-xs text-amber-600 font-medium">Grade</p>
              <p className="text-xl font-bold text-amber-900">{marksData.grade}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${marksData.result === 'Pass' ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-medium ${marksData.result === 'Pass' ? 'text-green-600' : 'text-red-600'}`}>Result</p>
              <p className={`text-xl font-bold ${marksData.result === 'Pass' ? 'text-green-900' : 'text-red-900'}`}>{marksData.result}</p>
            </div>
          </div>

          {/* Marks Table */}
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
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {marksData.marks.map((mark) => (
                    <tr key={mark.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{mark.subject_name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{mark.max_marks}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900">{mark.obtained_marks ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{mark.percentage !== null ? `${mark.percentage}%` : '—'}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-900">{mark.grade || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${mark.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {mark.is_pass ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{mark.remarks || '—'}</td>
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
