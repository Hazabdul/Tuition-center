'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { DataTable, type Column, FormDialog, ConfirmDialog, StatusBadge, PageHeader, StatCard, EmptyState, ErrorState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Award, CheckCircle, XCircle, PenSquare, Loader2, Users, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

interface ExamOption {
  id: string;
  name: string;
  code: string;
}

interface ExamSubject {
  id: string;
  subject_id: string;
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

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-green-100 text-green-700 border-green-200',
  'A': 'bg-green-100 text-green-700 border-green-200',
  'B+': 'bg-blue-100 text-blue-700 border-blue-200',
  'B': 'bg-blue-100 text-blue-700 border-blue-200',
  'C': 'bg-amber-100 text-amber-700 border-amber-200',
  'D': 'bg-orange-100 text-orange-700 border-orange-200',
  'F': 'bg-red-100 text-red-700 border-red-200',
};

function calcPercentage(obtained: number, max: number): number {
  if (!max || max <= 0) return 0;
  return Math.round((obtained / max) * 100 * 100) / 100;
}

function calcGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export default function TeacherMarksEntryPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const initialExamId = searchParams.get('exam_id') ?? '';

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [marksMap, setMarksMap] = useState<Record<string, MarkEntry>>({});

  // Fetch teacher's exams for the dropdown
  const { data: examsData, isLoading: examsLoading } = useQuery<{ data: ExamOption[] }>({
    queryKey: ['teacher-exams-list-marks'],
    queryFn: async () => {
      const res = await api.get<ExamOption[]>('/api/v1/teacher/exams?limit=100');
      return { data: res.data as ExamOption[] };
    },
  });

  // Fetch exam detail (with exam_subjects) when an exam is selected
  const {
    data: examDetail,
    isLoading: examLoading,
    isError: examError,
    refetch: refetchExam,
  } = useQuery<ExamDetail, Error>({
    queryKey: ['teacher-exam-detail-marks', selectedExamId],
    queryFn: async () => {
      const res = await api.get<ExamDetail>(`/api/v1/exams/${selectedExamId}`);
      return res.data as ExamDetail;
    },
    enabled: !!selectedExamId,
  });

  const examSubjects = examDetail?.exam_subjects ?? [];
  const selectedSubject = useMemo(
    () => examSubjects.find((s: ExamSubject) => s.subject_id === selectedSubjectId) ?? null,
    [examSubjects, selectedSubjectId]
  );
  const batchId = examDetail?.batch_id ?? '';

  // Fetch students in the exam's batch when a subject is selected
  const {
    data: batchDetail,
    isLoading: batchLoading,
    isError: batchError,
    refetch: refetchBatch,
  } = useQuery<BatchDetail, Error>({
    queryKey: ['teacher-marks-batch', batchId],
    queryFn: async () => {
      const res = await api.get<BatchDetail>(`/api/v1/batches/${batchId}`);
      return res.data as BatchDetail;
    },
    enabled: !!batchId && !!selectedSubjectId,
  });

  // Fetch existing marks for the selected exam + subject
  const {
    data: existingMarks,
    isLoading: marksLoading,
    isError: marksError,
    refetch: refetchMarks,
  } = useQuery<ExistingMark[], Error>({
    queryKey: ['teacher-existing-marks', selectedExamId, selectedSubjectId],
    queryFn: async () => {
      const res = await api.get<ExistingMark[]>(`/api/v1/exams/${selectedExamId}/marks?subject_id=${selectedSubjectId}`);
      return res.data as ExistingMark[];
    },
    enabled: !!selectedExamId && !!selectedSubjectId,
  });

  const students = batchDetail?.students ?? [];

  // Initialize marks map from existing marks when data loads/changes
  useEffect(() => {
    if (!students.length) {
      setMarksMap({});
      return;
    }
    const existingMap = new Map<string, ExistingMark>();
    (existingMarks ?? []).forEach((m: ExistingMark) => existingMap.set(m.student_id, m));

    const next: Record<string, MarkEntry> = {};
    students.forEach((s: StudentRow) => {
      const ex = existingMap.get(s.id);
      next[s.id] = {
        obtained_marks: ex?.obtained_marks != null ? String(ex.obtained_marks) : '',
        remarks: ex?.remarks ?? '',
      };
    });
    setMarksMap(next);
  }, [students, existingMarks]);

  // Reset subject selection when exam changes
  useEffect(() => {
    setSelectedSubjectId('');
    setMarksMap({});
  }, [selectedExamId]);

  // Derived per-student computed values
  const computed = useMemo(() => {
    const out: Record<string, { percentage: number; grade: string; is_pass: boolean; entered: boolean }> = {};
    const maxMarks = selectedSubject?.max_marks ?? 0;
    const passingMarks = selectedSubject?.passing_marks ?? 0;
    students.forEach((s: StudentRow) => {
      const entry = marksMap[s.id];
      const raw = entry?.obtained_marks ?? '';
      const num = raw === '' ? NaN : Number(raw);
      const entered = !Number.isNaN(num) && raw !== '';
      const obtained = entered ? num : 0;
      const percentage = entered ? calcPercentage(obtained, maxMarks) : 0;
      const grade = entered ? calcGrade(percentage) : '-';
      const is_pass = entered ? obtained >= passingMarks : false;
      out[s.id] = { percentage, grade, is_pass, entered };
    });
    return out;
  }, [marksMap, students, selectedSubject]);

  // Summary stats
  const summary = useMemo(() => {
    let entered = 0;
    let passed = 0;
    let failed = 0;
    Object.entries(computed).forEach(([_sid, c]) => {
      if (c.entered) {
        entered += 1;
        if (c.is_pass) passed += 1;
        else failed += 1;
      }
    });
    return { total: students.length, entered, passed, failed };
  }, [computed, students.length]);

  const setObtainedMarks = (studentId: string, value: string) => {
    // Allow empty, digits, and a single decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMarksMap((prev) => ({
        ...prev,
        [studentId]: { ...prev[studentId], obtained_marks: value },
      }));
    }
  };

  const setRemarks = (studentId: string, value: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks: value },
    }));
  };

  const bulkSaveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/api/v1/exams/${selectedExamId}/marks/bulk`, body),
    onSuccess: () => {
      toast({ title: 'Marks saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['teacher-existing-marks', selectedExamId, selectedSubjectId] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const handleSave = () => {
    if (!selectedExamId || !selectedSubjectId) {
      toast({ title: 'Select an exam and subject', variant: 'destructive' });
      return;
    }
    if (students.length === 0) {
      toast({ title: 'No students to enter marks for', variant: 'destructive' });
      return;
    }
    const maxMarks = selectedSubject?.max_marks ?? 0;
    const records = students
      .map((s: StudentRow) => {
        const entry = marksMap[s.id];
        const raw = entry?.obtained_marks ?? '';
        if (raw === '') return null;
        const obtained = Number(raw);
        if (Number.isNaN(obtained)) return null;
        const percentage = calcPercentage(obtained, maxMarks);
        const grade = calcGrade(percentage);
        const is_pass = obtained >= (selectedSubject?.passing_marks ?? 0);
        return {
          student_id: s.id,
          obtained_marks: obtained,
          grade,
          percentage,
          is_pass,
          remarks: entry?.remarks ?? '',
        };
      })
      .filter(Boolean) as Array<{
        student_id: string;
        obtained_marks: number;
        grade: string;
        percentage: number;
        is_pass: boolean;
        remarks: string;
      }>;

    if (records.length === 0) {
      toast({ title: 'Enter at least one mark before saving', variant: 'destructive' });
      return;
    }

    bulkSaveMutation.mutate({
      subject_id: selectedSubjectId,
      records,
    });
  };

  const isLoadingDetail = examLoading || batchLoading || marksLoading;
  const hasError = examError || batchError || marksError;

  const columns: Column<StudentRow>[] = [
    {
      key: 'name',
      header: 'Student',
      render: (s: StudentRow) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0">
            {s.first_name?.[0]?.toUpperCase()}
            {s.last_name?.[0]?.toUpperCase() ?? ''}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {s.first_name} {s.last_name ?? ''}
            </p>
            <p className="text-xs text-slate-500 md:hidden">{s.student_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'student_id',
      header: 'Student ID',
      render: (s: StudentRow) => (
        <span className="text-slate-500 hidden md:inline">{s.student_id}</span>
      ),
    },
    {
      key: 'marks',
      header: `Marks${selectedSubject ? ` / ${selectedSubject.max_marks}` : ''}`,
      render: (s: StudentRow) => {
        const entry = marksMap[s.id] ?? { obtained_marks: '', remarks: '' };
        const max = selectedSubject?.max_marks ?? 0;
        const num = entry.obtained_marks === '' ? NaN : Number(entry.obtained_marks);
        const outOfRange = !Number.isNaN(num) && max > 0 && num > max;
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              value={entry.obtained_marks}
              onChange={(e) => setObtainedMarks(s.id, e.target.value)}
              placeholder="0"
              min={0}
              max={max || undefined}
              step="0.01"
              className={`h-9 w-24 ${outOfRange ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
            />
            {outOfRange && <span className="text-xs text-red-600 whitespace-nowrap">Exceeds max</span>}
          </div>
        );
      },
    },
    {
      key: 'percentage',
      header: 'Percentage',
      render: (s: StudentRow) => {
        const c = computed[s.id];
        if (!c?.entered) return <span className="text-slate-400 lg:table-cell hidden">-</span>;
        const pctColor = c.percentage >= 50 ? 'text-green-600' : 'text-red-600';
        return (
          <div className="flex items-center gap-2 hidden lg:flex">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${c.percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(c.percentage, 100)}%` }}
              />
            </div>
            <span className={`text-xs font-medium ${pctColor}`}>{c.percentage}%</span>
          </div>
        );
      },
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (s: StudentRow) => {
        const c = computed[s.id];
        if (!c?.entered) return <span className="text-slate-400">-</span>;
        const cls = GRADE_COLORS[c.grade] ?? 'bg-slate-100 text-slate-600 border-slate-200';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
            {c.grade}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: StudentRow) => {
        const c = computed[s.id];
        if (!c?.entered) return <span className="text-slate-400">-</span>;
        return c.is_pass ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle className="h-3.5 w-3.5" />
            Pass
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            <XCircle className="h-3.5 w-3.5" />
            Fail
          </span>
        );
      },
    },
    {
      key: 'remarks',
      header: 'Remarks',
      render: (s: StudentRow) => {
        const entry = marksMap[s.id] ?? { obtained_marks: '', remarks: '' };
        return (
          <Input
            value={entry.remarks}
            onChange={(e) => setRemarks(s.id, e.target.value)}
            placeholder="Optional remarks"
            className="h-8 text-xs hidden md:block"
          />
        );
      },
    },
  ];

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="Enter Marks" description="Record and manage student marks for your assigned exams">
        <Button
          onClick={handleSave}
          disabled={bulkSaveMutation.isPending || !selectedSubjectId || students.length === 0}
        >
          {bulkSaveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Marks
            </>
          )}
        </Button>
      </PageHeader>

      {/* Selector card */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PenSquare className="h-5 w-5 text-blue-500" />
            Marks Entry Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Exam *</Label>
              <Select
                value={selectedExamId}
                onValueChange={(v) => {
                  setSelectedExamId(v);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={examsLoading ? 'Loading exams...' : 'Select an exam'} />
                </SelectTrigger>
                <SelectContent>
                  {(examsData?.data ?? []).map((e: ExamOption) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={selectedSubjectId}
                onValueChange={(v) => setSelectedSubjectId(v)}
                disabled={!selectedExamId || examLoading || examSubjects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !selectedExamId
                        ? 'Select an exam first'
                        : examLoading
                        ? 'Loading subjects...'
                        : examSubjects.length === 0
                        ? 'No subjects in exam'
                        : 'Select a subject'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {examSubjects.map((es: ExamSubject) => (
                    <SelectItem key={es.id} value={es.subject_id}>
                      {es.subject?.name ?? 'Unknown'} ({es.subject?.code ?? '-'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject info */}
          {selectedSubject && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Subject</p>
                <p className="text-sm font-medium text-slate-900">
                  {selectedSubject.subject?.name ?? '-'}{' '}
                  <span className="text-slate-400">({selectedSubject.subject?.code ?? '-'})</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Max Marks</p>
                <p className="text-sm font-medium text-slate-900">{selectedSubject.max_marks}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Passing Marks</p>
                <p className="text-sm font-medium text-slate-900">{selectedSubject.passing_marks}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* No exam selected */}
      {!selectedExamId && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              title="Select an exam to begin"
              description="Choose one of your assigned exams above to load its subjects and start entering marks."
            />
          </CardContent>
        </Card>
      )}

      {/* Exam selected but no subject */}
      {selectedExamId && !selectedSubjectId && !examLoading && !examError && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              title="Select a subject"
              description="Pick a subject from this exam to load the student list and enter marks."
            />
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {selectedSubjectId && isLoadingDetail && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm">Loading students and marks...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {selectedSubjectId && !isLoadingDetail && hasError && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <ErrorState
              message="Failed to load marks data. Please try again."
              onRetry={() => {
                if (examError) refetchExam();
                if (batchError) refetchBatch();
                if (marksError) refetchMarks();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Loaded: no students */}
      {selectedSubjectId && !isLoadingDetail && !hasError && students.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              title="No students enrolled"
              description="This exam's batch has no students assigned. Students must be added to the batch before marks can be entered."
            />
          </CardContent>
        </Card>
      )}

      {/* Loaded: student marks table */}
      {selectedSubjectId && !isLoadingDetail && !hasError && students.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Total Students" value={summary.total} icon={Users} color="blue" />
            <StatCard title="Marks Entered" value={summary.entered} icon={PenSquare} color="purple" />
            <StatCard title="Passed" value={summary.passed} icon={CheckCircle} color="green" />
            <StatCard title="Failed" value={summary.failed} icon={XCircle} color="red" />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                Students
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-normal">
                  {students.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable data={students} columns={columns} />
            </CardContent>
          </Card>

          {/* Mobile remarks (shown below table since remarks column is hidden on small screens) */}
          <div className="md:hidden mt-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-base">Remarks</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0">
                {students.map((s: StudentRow) => {
                  const entry = marksMap[s.id] ?? { obtained_marks: '', remarks: '' };
                  return (
                    <div key={`remarks-${s.id}`} className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        {s.first_name} {s.last_name ?? ''}
                      </p>
                      <Input
                        value={entry.remarks}
                        onChange={(e) => setRemarks(s.id, e.target.value)}
                        placeholder="Optional remarks"
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Sticky save bar */}
          <div className="sticky bottom-4 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 shadow-md rounded-lg p-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Award className="h-4 w-4 text-slate-400" />
              <span>
                <span className="font-medium text-slate-900">{summary.entered}</span> of{' '}
                <span className="font-medium text-slate-900">{summary.total}</span> entered ·{' '}
                <span className="font-medium text-green-600">{summary.passed}</span> passed ·{' '}
                <span className="font-medium text-red-600">{summary.failed}</span> failed
              </span>
            </div>
            <Button
              onClick={handleSave}
              disabled={bulkSaveMutation.isPending}
              className="sm:w-auto w-full"
            >
              {bulkSaveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Marks
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
