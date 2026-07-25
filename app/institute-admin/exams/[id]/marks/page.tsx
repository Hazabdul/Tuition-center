'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import {
  DataTable,
  type Column,
  FormDialog,
  ConfirmDialog,
  StatusBadge,
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Award, CheckCircle, XCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

// ---------- Types ----------

interface ExamSubject {
  id: string;
  subject_id: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  max_marks: number;
  passing_marks: number;
  subject?: { id: string; name: string; code: string } | null;
}

interface ExamDetail {
  id: string;
  name: string;
  code: string;
  batch_id: string;
  status: string;
  exam_subjects?: ExamSubject[];
  batch?: { id: string; name: string; code: string } | null;
}

interface StudentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  student_id: string;
}

interface BatchDetail {
  id: string;
  name: string;
  code: string;
  students?: StudentRow[];
}

interface ExistingMark {
  id: string;
  student_id: string;
  obtained_marks: number | null;
  grade: string | null;
  percentage: number | null;
  is_pass: boolean;
  remarks: string | null;
}

interface MarkEntry {
  obtained_marks: string;
  remarks: string;
}

// ---------- Helpers ----------

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

function fullStudentName(s: StudentRow): string {
  return [s.first_name, s.last_name].filter(Boolean).join(' ') || '—';
}

// ---------- Page ----------

export default function MarksEntryPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const examId = params.id;

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [marksMap, setMarksMap] = useState<Record<string, MarkEntry>>({});

  // ---------- Queries ----------

  const examQuery = useQuery<ExamDetail, Error>({
    queryKey: ['exam', examId],
    queryFn: async () => {
      const res = await api.get<ExamDetail>(`/api/v1/exams/${examId}`);
      return res.data as ExamDetail;
    },
    enabled: !!examId,
  });

  const exam = examQuery.data;
  const batchId = exam?.batch_id;

  const batchQuery = useQuery<BatchDetail, Error>({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const res = await api.get<BatchDetail>(`/api/v1/batches/${batchId}`);
      return res.data as BatchDetail;
    },
    enabled: !!batchId,
  });

  const students = batchQuery.data?.students || [];

  const marksQuery = useQuery<ExistingMark[], Error>({
    queryKey: ['exam-marks', examId, selectedSubjectId],
    queryFn: async () => {
      const res = await api.get<ExistingMark[]>(
        `/api/v1/exams/${examId}/marks?subject_id=${selectedSubjectId}`,
      );
      return res.data as ExistingMark[];
    },
    enabled: !!examId && !!selectedSubjectId,
  });

  const existingMarks = marksQuery.data || [];

  // Initialize marks map from existing marks when loaded/changed
  useEffect(() => {
    if (!marksQuery.data) return;
    const next: Record<string, MarkEntry> = {};
    for (const m of marksQuery.data) {
      next[m.student_id] = {
        obtained_marks: m.obtained_marks != null ? String(m.obtained_marks) : '',
        remarks: m.remarks || '',
      };
    }
    setMarksMap(next);
  }, [marksQuery.data]);

  // ---------- Derived values ----------

  const selectedSubject = useMemo(
    () => exam?.exam_subjects?.find((s: ExamSubject) => s.id === selectedSubjectId) || null,
    [exam, selectedSubjectId],
  );

  const maxMarks = selectedSubject?.max_marks ?? 0;
  const passingMarks = selectedSubject?.passing_marks ?? 0;

  // Per-student computed view model
  const studentRows = useMemo(() => {
    return students.map((s: StudentRow) => {
      const entry = marksMap[s.id] || { obtained_marks: '', remarks: '' };
      const raw = entry.obtained_marks;
      const obtained = raw === '' ? null : Number(raw);
      let percentage: number | null = null;
      let grade: string | null = null;
      let isPass: boolean | null = null;

      if (obtained != null && !Number.isNaN(obtained) && maxMarks > 0) {
        percentage = (obtained / maxMarks) * 100;
        grade = calculateGrade(percentage);
        isPass = obtained >= passingMarks;
      }

      return {
        student: s,
        entry,
        obtained,
        percentage,
        grade,
        isPass,
      };
    });
  }, [students, marksMap, maxMarks, passingMarks]);

  // Summary stats
  const stats = useMemo(() => {
    let entered = 0;
    let passed = 0;
    let failed = 0;
    for (const r of studentRows) {
      if (r.obtained != null && !Number.isNaN(r.obtained)) {
        entered += 1;
        if (r.isPass) passed += 1;
        else failed += 1;
      }
    }
    return { total: students.length, entered, passed, failed };
  }, [studentRows, students.length]);

  // ---------- Save mutation ----------

  const saveMutation = useMutation({
    mutationFn: async () => {
      const records = studentRows
        .filter((r: (typeof studentRows)[number]) => r.obtained != null && !Number.isNaN(r.obtained))
        .map((r: (typeof studentRows)[number]) => ({
          student_id: r.student.id,
          obtained_marks: r.obtained as number,
          grade: r.grade as string,
          percentage: r.percentage as number,
          is_pass: r.isPass as boolean,
          remarks: r.entry.remarks || '',
        }));

      const body = {
        subject_id: selectedSubjectId,
        records,
      };

      return api.post(`/api/v1/exams/${examId}/marks/bulk`, body);
    },
    onSuccess: () => {
      toast({ title: 'Marks saved successfully' });
      queryClient.invalidateQueries({
        queryKey: ['exam-marks', examId, selectedSubjectId],
      });
    },
    onError: (err: Error) => {
      toast({ title: err.message || 'Failed to save marks', variant: 'destructive' });
    },
  });

  // ---------- Handlers ----------

  function handleSubjectChange(value: string) {
    setSelectedSubjectId(value);
    setMarksMap({});
  }

  function handleMarksChange(studentId: string, value: string) {
    // Allow empty or numeric input only
    if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
      setMarksMap((prev) => ({
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { obtained_marks: '', remarks: '' }),
          obtained_marks: value,
        },
      }));
    }
  }

  function handleRemarksChange(studentId: string, value: string) {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { obtained_marks: '', remarks: '' }),
        remarks: value,
      },
    }));
  }

  function handleSave() {
    if (!selectedSubjectId) {
      toast({ title: 'Please select a subject first', variant: 'destructive' });
      return;
    }
    if (stats.entered === 0) {
      toast({ title: 'Enter marks for at least one student', variant: 'destructive' });
      return;
    }
    saveMutation.mutate();
  }

  // ---------- Loading / Error states ----------

  if (examQuery.isLoading) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (examQuery.isError || !exam) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/institute-admin/exams')}
          className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Exams
        </Button>
        <ErrorState
          message="Failed to load exam details"
          onRetry={() => examQuery.refetch()}
        />
      </DashboardLayout>
    );
  }

  // ---------- Table columns ----------

  const columns: Column<(typeof studentRows)[number]>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{fullStudentName(row.student)}</p>
          <p className="text-xs text-slate-500">{row.student.student_id}</p>
        </div>
      ),
    },
    {
      key: 'student_id_code',
      header: 'Student ID',
      render: (row) => (
        <span className="font-mono text-sm text-slate-600">{row.student.student_id}</span>
      ),
    },
    {
      key: 'marks',
      header: `Marks (Max ${maxMarks})`,
      render: (row) => (
        <Input
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={maxMarks}
          placeholder="—"
          value={row.entry.obtained_marks}
          onChange={(e) => handleMarksChange(row.student.id, e.target.value)}
          className="w-24"
          disabled={saveMutation.isPending}
        />
      ),
    },
    {
      key: 'percentage',
      header: 'Percentage',
      render: (row) => (
        <span className="text-slate-700">
          {row.percentage != null ? `${row.percentage.toFixed(2)}%` : '—'}
        </span>
      ),
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => (
        <span className="font-medium text-slate-900">{row.grade ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        if (row.isPass === null) return <span className="text-slate-400">—</span>;
        return row.isPass ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
            <CheckCircle className="h-3.5 w-3.5" /> Pass
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 ring-1 ring-rose-600/20">
            <XCircle className="h-3.5 w-3.5" /> Fail
          </span>
        );
      },
    },
  ];

  // ---------- Render ----------

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/institute-admin/exams/${examId}`)}
        className="mb-4 -ml-2 text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Exam
      </Button>

      <PageHeader
        title="Enter Marks"
        description={`${exam.name} · Code: ${exam.code}`}
      >
        <Button onClick={handleSave} disabled={saveMutation.isPending || !selectedSubjectId}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving…' : 'Save Marks'}
        </Button>
      </PageHeader>

      {/* Subject selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-slate-500" />
            Select Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="subject-select">Subject</Label>
            <Select value={selectedSubjectId} onValueChange={handleSubjectChange}>
              <SelectTrigger id="subject-select" className="w-full sm:w-80">
                <SelectValue placeholder="Choose a subject to enter marks" />
              </SelectTrigger>
              <SelectContent>
                {(exam.exam_subjects || []).map((es: ExamSubject) => (
                  <SelectItem key={es.id} value={es.id}>
                    {es.subject?.name || 'Unknown'} ({es.subject?.code || '—'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSubject && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Max Marks</p>
                <p className="text-lg font-semibold text-slate-900">{maxMarks}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Passing Marks</p>
                <p className="text-lg font-semibold text-slate-900">{passingMarks}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Exam Date</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedSubject.exam_date || '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No subject selected */}
      {!selectedSubjectId && (
        <EmptyState
          title="No subject selected"
          description="Please select a subject above to start entering marks for students."
        />
      )}

      {/* Subject selected but loading batch/students */}
      {selectedSubjectId && batchQuery.isLoading && (
        <Card>
          <CardContent className="py-10">
            <div className="space-y-3">
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
              <div className="h-10 bg-slate-200 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject selected but batch error */}
      {selectedSubjectId && batchQuery.isError && (
        <ErrorState
          message="Failed to load students for this batch"
          onRetry={() => batchQuery.refetch()}
        />
      )}

      {/* Subject selected, students loaded but empty */}
      {selectedSubjectId && !batchQuery.isLoading && students.length === 0 && (
        <EmptyState
          title="No students found"
          description="There are no students enrolled in this exam's batch."
        />
      )}

      {/* Students table + stats */}
      {selectedSubjectId && students.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6 lg:grid-cols-4">
            <StatCard
              title="Total Students"
              value={stats.total}
              icon={Award}
              description="In batch"
              color="blue"
            />
            <StatCard
              title="Marks Entered"
              value={stats.entered}
              icon={CheckCircle}
              description="Of total"
              color="purple"
            />
            <StatCard
              title="Passed"
              value={stats.passed}
              icon={CheckCircle}
              description="Above passing"
              color="green"
            />
            <StatCard
              title="Failed"
              value={stats.failed}
              icon={XCircle}
              description="Below passing"
              color="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Student Marks</span>
                {marksQuery.isLoading && (
                  <span className="text-xs font-normal text-slate-500">Loading existing marks…</span>
                )}
                {marksQuery.isError && (
                  <span className="text-xs font-normal text-rose-600">
                    Could not load existing marks
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                data={studentRows}
                emptyMessage="No students to display"
              />
            </CardContent>
          </Card>

          {/* Sticky save bar */}
          <div className="sticky bottom-0 mt-6 -mx-4 sm:mx-0 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:rounded-lg sm:border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">{stats.entered}</span> of{' '}
                <span className="font-medium text-slate-900">{stats.total}</span> students marked
                {stats.entered > 0 && (
                  <>
                    {' · '}
                    <span className="text-emerald-600">{stats.passed} pass</span>
                    {' · '}
                    <span className="text-rose-600">{stats.failed} fail</span>
                  </>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || stats.entered === 0}
                className="w-full sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Saving…' : 'Save Marks'}
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
