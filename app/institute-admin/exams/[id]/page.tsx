'use client';

import { useState } from 'react';
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
import {
  Plus,
  Trash2,
  ArrowLeft,
  Calendar,
  PenSquare,
  Send,
  EyeOff,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useRouter, useParams } from 'next/navigation';

interface ExamSubjectRow {
  id: string;
  exam_id: string;
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
  academic_year: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'published';
  batch?: { id: string; name: string; code: string } | null;
  exam_subjects?: ExamSubjectRow[];
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface AddSubjectForm {
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: string;
  passing_marks: string;
}

const EMPTY_ADD_FORM: AddSubjectForm = {
  subject_id: '',
  exam_date: '',
  start_time: '',
  end_time: '',
  max_marks: '',
  passing_marks: '',
};

export default function ExamDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [deleteSubjectTarget, setDeleteSubjectTarget] = useState<ExamSubjectRow | null>(null);
  const [addForm, setAddForm] = useState<AddSubjectForm>(EMPTY_ADD_FORM);

  const examQueryKey = ['exam', params.id];

  const { data: exam, isLoading, isError, refetch } = useQuery<ExamDetail, Error>({
    queryKey: examQueryKey,
    queryFn: async () => {
      const res = await api.get<ExamDetail>(`/api/v1/exams/${params.id}`);
      return res.data as ExamDetail;
    },
    enabled: !!params.id,
  });

  const { data: subjectsData, isLoading: subjectsLoading } = useQuery<SubjectOption[], Error>({
    queryKey: ['subjects-list-100'],
    queryFn: async () => {
      const res = await api.get<SubjectOption[]>('/api/v1/subjects?limit=100');
      return res.data as SubjectOption[];
    },
  });

  const subjects = subjectsData || [];

  const statusMutation = useMutation({
    mutationFn: (status: ExamDetail['status']) =>
      api.patch(`/api/v1/exams/${params.id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Exam status updated' });
      queryClient.invalidateQueries({ queryKey: examQueryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const addSubjectMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post(`/api/v1/exams/${params.id}/subjects`, body),
    onSuccess: () => {
      toast({ title: 'Subject added to exam' });
      setShowAddSubject(false);
      setAddForm(EMPTY_ADD_FORM);
      queryClient.invalidateQueries({ queryKey: examQueryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId: string) =>
      api.delete(`/api/v1/exams/${params.id}/subjects/${subjectId}`),
    onSuccess: () => {
      toast({ title: 'Subject removed from exam' });
      setDeleteSubjectTarget(null);
      queryClient.invalidateQueries({ queryKey: examQueryKey });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function handleAddSubject() {
    if (!addForm.subject_id) {
      toast({ title: 'Please select a subject', variant: 'destructive' });
      return;
    }
    if (!addForm.exam_date) {
      toast({ title: 'Please select an exam date', variant: 'destructive' });
      return;
    }
    if (!addForm.start_time || !addForm.end_time) {
      toast({ title: 'Please provide start and end time', variant: 'destructive' });
      return;
    }
    if (!addForm.max_marks || !addForm.passing_marks) {
      toast({ title: 'Please provide max and passing marks', variant: 'destructive' });
      return;
    }

    const body: Record<string, unknown> = {
      subject_id: addForm.subject_id,
      exam_date: addForm.exam_date,
      start_time: addForm.start_time,
      end_time: addForm.end_time,
      max_marks: Number(addForm.max_marks),
      passing_marks: Number(addForm.passing_marks),
    };
    addSubjectMutation.mutate(body);
  }

  function handleStatusChange(status: ExamDetail['status']) {
    statusMutation.mutate(status);
  }

  const columns: Column<ExamSubjectRow>[] = [
    {
      key: 'subject_name',
      header: 'Subject Name',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.subject?.name || '—'}</p>
          <p className="text-xs text-slate-500">{row.subject?.code || ''}</p>
        </div>
      ),
    },
    {
      key: 'exam_date',
      header: 'Exam Date',
      render: (row) => (
        <span className="text-slate-600">{row.exam_date ? formatDate(row.exam_date) : '—'}</span>
      ),
    },
    {
      key: 'start_time',
      header: 'Start Time',
      render: (row) => <span className="text-slate-600">{row.start_time || '—'}</span>,
    },
    {
      key: 'end_time',
      header: 'End Time',
      render: (row) => <span className="text-slate-600">{row.end_time || '—'}</span>,
    },
    {
      key: 'max_marks',
      header: 'Max Marks',
      render: (row) => <span className="font-medium text-slate-900">{row.max_marks}</span>,
    },
    {
      key: 'passing_marks',
      header: 'Passing Marks',
      render: (row) => <span className="font-medium text-slate-900">{row.passing_marks}</span>,
    },
  ];

  const examSubjects = exam?.exam_subjects || [];

  // Loading skeleton
  if (isLoading) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (isError || !exam) {
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
        <ErrorState message="Failed to load exam details" onRetry={() => refetch()} />
      </DashboardLayout>
    );
  }

  const currentStatus = exam.status;

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

      <PageHeader
        title={exam.name}
        description={`Code: ${exam.code} · ${exam.academic_year || 'N/A'}`}
      >
        <Button onClick={() => router.push(`/institute-admin/exams/${exam.id}/marks`)}>
          <PenSquare className="h-4 w-4 mr-2" /> Enter Marks
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Subjects"
          value={examSubjects.length}
          icon={Calendar}
          description="Assigned subjects"
          color="blue"
        />
        <StatCard
          title="Status"
          value={currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
          icon={Clock}
          description="Current status"
          color="amber"
        />
        <StatCard
          title="Start Date"
          value={exam.start_date ? formatDate(exam.start_date) : '—'}
          icon={Calendar}
          description="Exam begins"
          color="green"
        />
        <StatCard
          title="End Date"
          value={exam.end_date ? formatDate(exam.end_date) : '—'}
          icon={Calendar}
          description="Exam ends"
          color="purple"
        />
      </div>

      {/* Exam info card */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Exam Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow label="Exam Name" value={exam.name} />
            <InfoRow label="Exam Code" value={exam.code} />
            <InfoRow label="Batch" value={exam.batch?.name || '—'} />
            <InfoRow label="Academic Year" value={exam.academic_year || '—'} />
            <InfoRow label="Start Date" value={exam.start_date ? formatDate(exam.start_date) : '—'} />
            <InfoRow label="End Date" value={exam.end_date ? formatDate(exam.end_date) : '—'} />
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow label="Description" value={exam.description || '—'} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <StatusBadge status={currentStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Status management buttons */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Status Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {currentStatus === 'draft' && (
              <Button
                variant="default"
                onClick={() => handleStatusChange('scheduled')}
                disabled={statusMutation.isPending}
              >
                <Calendar className="h-4 w-4 mr-2" /> Schedule Exam
              </Button>
            )}
            {currentStatus === 'scheduled' && (
              <Button
                variant="default"
                onClick={() => handleStatusChange('completed')}
                disabled={statusMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Mark as Completed
              </Button>
            )}
            {(currentStatus === 'completed' || currentStatus === 'draft') && (
              <Button
                variant="default"
                onClick={() => handleStatusChange('published')}
                disabled={statusMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" /> Publish Results
              </Button>
            )}
            {currentStatus === 'published' && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange('draft')}
                disabled={statusMutation.isPending}
              >
                <EyeOff className="h-4 w-4 mr-2" /> Unpublish
              </Button>
            )}
            {statusMutation.isPending && (
              <span className="text-xs text-slate-500">Updating status…</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            {currentStatus === 'draft' && 'This exam is in draft. Schedule it once the timetable is ready.'}
            {currentStatus === 'scheduled' && 'Exam is scheduled. Mark as completed once conducted.'}
            {currentStatus === 'completed' && 'Exam is completed. Publish results to make them visible.'}
            {currentStatus === 'published' && 'Results are published and visible to students.'}
          </p>
        </CardContent>
      </Card>

      {/* Assigned subjects */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Assigned Subjects</CardTitle>
            <Button onClick={() => setShowAddSubject(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Add Subject
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {examSubjects.length === 0 ? (
            <EmptyState
              title="No subjects assigned"
              description="Add subjects to this exam to define the timetable and marking scheme."
              action={
                <Button onClick={() => setShowAddSubject(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Add Subject
                </Button>
              }
            />
          ) : (
            <DataTable<ExamSubjectRow>
              columns={columns}
              data={examSubjects}
              rowActions={(row) => (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteSubjectTarget(row)}
                  title="Remove subject"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              emptyMessage="No subjects assigned to this exam"
            />
          )}
        </CardContent>
      </Card>

      {/* Add subject dialog */}
      <FormDialog
        open={showAddSubject}
        onOpenChange={(open) => {
          setShowAddSubject(open);
          if (!open) setAddForm(EMPTY_ADD_FORM);
        }}
        title="Add Subject to Exam"
        description="Assign a subject with its exam schedule and marking scheme."
        submitLabel="Add Subject"
        isSubmitting={addSubjectMutation.isPending}
        onSubmit={handleAddSubject}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Subject *</Label>
            <Select
              value={addForm.subject_id}
              onValueChange={(v) => setAddForm({ ...addForm, subject_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectsLoading && <SelectItem value="loading" disabled>Loading…</SelectItem>}
                {subjects.map((s: SubjectOption) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Exam Date *</Label>
            <Input
              type="date"
              value={addForm.exam_date}
              onChange={(e) => setAddForm({ ...addForm, exam_date: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Start Time *</Label>
            <Input
              type="time"
              value={addForm.start_time}
              onChange={(e) => setAddForm({ ...addForm, start_time: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>End Time *</Label>
            <Input
              type="time"
              value={addForm.end_time}
              onChange={(e) => setAddForm({ ...addForm, end_time: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Max Marks *</Label>
            <Input
              type="number"
              value={addForm.max_marks}
              onChange={(e) => setAddForm({ ...addForm, max_marks: e.target.value })}
              placeholder="100"
              min="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Passing Marks *</Label>
            <Input
              type="number"
              value={addForm.passing_marks}
              onChange={(e) => setAddForm({ ...addForm, passing_marks: e.target.value })}
              placeholder="40"
              min="0"
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete subject confirmation */}
      <ConfirmDialog
        open={!!deleteSubjectTarget}
        onOpenChange={(open) => !open && setDeleteSubjectTarget(null)}
        title="Remove Subject"
        description={`Remove ${deleteSubjectTarget?.subject?.name || 'this subject'} from the exam? This cannot be undone.`}
        onConfirm={() =>
          deleteSubjectTarget && deleteSubjectMutation.mutate(deleteSubjectTarget.subject_id)
        }
        confirmLabel="Remove"
        variant="destructive"
        isSubmitting={deleteSubjectMutation.isPending}
      />
    </DashboardLayout>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
