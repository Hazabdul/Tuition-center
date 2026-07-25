'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { BookOpen, Award, Target, FileText } from 'lucide-react';

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  syllabus: string | null;
  max_marks: number;
  passing_marks: number;
  is_active: boolean;
}

export default function StudentSubjectsPage() {
  const api = useApi();
  const [activeSyllabusSubject, setActiveSyllabusSubject] = useState<SubjectRow | null>(null);

  const { data, isLoading } = useQuery<SubjectRow[]>({
    queryKey: ['student-subjects'],
    queryFn: async () => {
      const res = await api.get<SubjectRow[]>('/api/v1/subjects');
      return res.data || [];
    },
  });

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="My Subjects" description="Subjects in your enrolled batches" />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-36 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No subjects found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((subject: any) => (
            <Card key={subject.id} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{subject.name}</CardTitle>
                    <Badge variant="outline" className="text-xs mt-1">{subject.code}</Badge>
                  </div>
                  <StatusBadge status={subject.is_active ? 'active' : 'inactive'} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subject.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">{subject.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-500" />
                    Max: <span className="font-medium">{subject.max_marks ?? subject.maxMarks}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-green-500" />
                    Pass: <span className="font-medium">{subject.passing_marks ?? subject.passingMarks}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                  onClick={() => setActiveSyllabusSubject(subject)}
                >
                  <FileText className="h-3.5 w-3.5 mr-1.5" /> View Syllabus
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Syllabus Modal */}
      <Dialog open={!!activeSyllabusSubject} onOpenChange={(open) => !open && setActiveSyllabusSubject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-purple-600" />
              <span>{activeSyllabusSubject?.name} ({activeSyllabusSubject?.code}) - Syllabus</span>
            </DialogTitle>
            <DialogDescription>Detailed subject curriculum and topics</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {activeSyllabusSubject?.syllabus ? (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                {activeSyllabusSubject.syllabus}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic text-center py-6">No syllabus added yet for this subject.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
