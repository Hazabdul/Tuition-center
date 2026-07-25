'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, BookOpen, FileText, Plus, Users, GraduationCap, Unlink, Link2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Subject, Batch, Teacher, Student } from '@/lib/types';

interface ExtendedSubject extends Subject {
  max_marks?: number;
  passing_marks?: number;
  is_active?: boolean;
  batches?: Batch[];
  teachers?: Teacher[];
  students?: Student[];
}

interface SubjectFormData {
  name: string;
  code: string;
  description: string;
  maxMarks: string;
  passingMarks: string;
}

const EMPTY_FORM: SubjectFormData = {
  name: '', code: '', description: '', maxMarks: '100', passingMarks: '40',
};

function toForm(s: ExtendedSubject): SubjectFormData {
  return {
    name: s.name || '',
    code: s.code || '',
    description: s.description || '',
    maxMarks: String(s.maxMarks ?? s.max_marks ?? 100),
    passingMarks: String(s.passingMarks ?? s.passing_marks ?? 40),
  };
}

export default function EditSubjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SubjectFormData>(EMPTY_FORM);
  const [showLinkBatch, setShowLinkBatch] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [showLinkTeacher, setShowLinkTeacher] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showLinkStudent, setShowLinkStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const { data: subject, isLoading } = useQuery<ExtendedSubject, Error>({
    queryKey: ['subject', params.id],
    queryFn: async () => {
      const res = await api.get<ExtendedSubject>(`/api/v1/subjects/${params.id}`);
      return res.data;
    },
  });

  const { data: allBatches } = useQuery<Batch[]>({
    queryKey: ['all-batches-picker'],
    queryFn: async () => {
      const res = await api.get<Batch[]>('/api/v1/batches?limit=100');
      return res.data || [];
    },
    enabled: showLinkBatch,
  });

  const { data: allTeachers } = useQuery<Teacher[]>({
    queryKey: ['all-teachers-picker'],
    queryFn: async () => {
      const res = await api.get<Teacher[]>('/api/v1/teachers?limit=100');
      return res.data || [];
    },
    enabled: showLinkTeacher,
  });

  const { data: allStudents } = useQuery<Student[]>({
    queryKey: ['all-students-picker'],
    queryFn: async () => {
      const res = await api.get<Student[]>('/api/v1/students?limit=100');
      return res.data || [];
    },
    enabled: showLinkStudent,
  });

  useEffect(() => {
    if (subject) setForm(toForm(subject));
  }, [subject]);

  const updateMutation = useMutation({
    mutationFn: (body: SubjectFormData) => api.put(`/api/v1/subjects/${params.id}`, body),
    onSuccess: () => {
      toast({ title: 'Subject updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const linkBatchMutation = useMutation({
    mutationFn: (batchId: string) => api.post(`/api/v1/subjects/${params.id}/batches`, { batchId }),
    onSuccess: () => {
      toast({ title: 'Batch linked to subject!' });
      setShowLinkBatch(false);
      setSelectedBatchId('');
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkBatchMutation = useMutation({
    mutationFn: (batchId: string) => api.delete(`/api/v1/subjects/${params.id}/batches?batchId=${batchId}`),
    onSuccess: () => {
      toast({ title: 'Batch unlinked from subject' });
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const linkTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => api.post(`/api/v1/subjects/${params.id}/teachers`, { teacherId }),
    onSuccess: () => {
      toast({ title: 'Teacher linked to subject!' });
      setShowLinkTeacher(false);
      setSelectedTeacherId('');
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => api.delete(`/api/v1/subjects/${params.id}/teachers?teacherId=${teacherId}`),
    onSuccess: () => {
      toast({ title: 'Teacher unlinked from subject' });
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const linkStudentMutation = useMutation({
    mutationFn: (studentId: string) => api.post(`/api/v1/subjects/${params.id}/students`, { studentId }),
    onSuccess: () => {
      toast({ title: 'Student linked to subject!' });
      setShowLinkStudent(false);
      setSelectedStudentId('');
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkStudentMutation = useMutation({
    mutationFn: (studentId: string) => api.delete(`/api/v1/subjects/${params.id}/students?studentId=${studentId}`),
    onSuccess: () => {
      toast({ title: 'Student unlinked from subject' });
      queryClient.invalidateQueries({ queryKey: ['subject', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function set<K extends keyof SubjectFormData>(key: K, value: SubjectFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading || !subject) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const linkedBatchIds = new Set(subject.batches?.map((b: any) => b.id) || []);
  const availableBatches = (allBatches || []).filter((b: any) => !linkedBatchIds.has(b.id));

  const linkedTeacherIds = new Set(subject.teachers?.map((t: any) => t.id) || []);
  const availableTeachers = (allTeachers || []).filter((t: any) => !linkedTeacherIds.has(t.id));

  const linkedStudentIds = new Set(subject.students?.map((s: any) => s.id) || []);
  const availableStudents = (allStudents || []).filter((s: any) => !linkedStudentIds.has(s.id));

  const maxMarksVal = subject.maxMarks ?? subject.max_marks ?? 100;
  const passMarksVal = subject.passingMarks ?? subject.passing_marks ?? 40;
  const activeVal = subject.isActive ?? subject.is_active ?? true;

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/subjects')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Subjects
      </Button>

      <PageHeader title={`Subject: ${subject.name}`} description={`Code: ${subject.code} · Max Marks: ${maxMarksVal} · Pass Marks: ${passMarksVal}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <StatCard title="Linked Batches" value={subject.batches?.length || 0} icon={BookOpen} color="blue" />
        <StatCard title="Linked Teachers" value={subject.teachers?.length || 0} icon={Users} color="purple" />
        <StatCard title="Direct Students" value={subject.students?.length || 0} icon={GraduationCap} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Edit Form */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Subject Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-4">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set('code', e.target.value)} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Max Marks</Label><Input type="number" value={form.maxMarks} onChange={(e) => set('maxMarks', e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Passing Marks</Label><Input type="number" value={form.passingMarks} onChange={(e) => set('passingMarks', e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <StatusBadge status={activeVal ? 'active' : 'inactive'} />
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Details
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Linked Batches, Teachers, and Students */}
        <div className="lg:col-span-2 space-y-6">
          {/* Linked Batches Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-500" /> Linked Batches
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkBatch(!showLinkBatch)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Link Batch
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkBatch && (
                <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <Label className="text-xs font-medium">Select Batch to Link</Label>
                  <div className="flex gap-2">
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Choose batch..." /></SelectTrigger>
                      <SelectContent>
                        {availableBatches.length === 0 ? (
                          <SelectItem value="_none" disabled>All batches are already linked</SelectItem>
                        ) : (
                          availableBatches.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => selectedBatchId && linkBatchMutation.mutate(selectedBatchId)} disabled={!selectedBatchId || linkBatchMutation.isPending}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                  </div>
                </div>
              )}

              {(!subject.batches || subject.batches.length === 0) ? (
                <EmptyState title="No batches linked" description="This subject is not linked to any batch yet." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subject.batches.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.code}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => unlinkBatchMutation.mutate(b.id)}>
                        <Unlink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Teachers Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" /> Linked Teachers
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkTeacher(!showLinkTeacher)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Link Teacher
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkTeacher && (
                <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <Label className="text-xs font-medium">Select Teacher to Link</Label>
                  <div className="flex gap-2">
                    <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                      <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Choose teacher..." /></SelectTrigger>
                      <SelectContent>
                        {availableTeachers.length === 0 ? (
                          <SelectItem value="_none" disabled>All teachers are already linked</SelectItem>
                        ) : (
                          availableTeachers.map((t: any) => {
                            const name = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim() || 'Teacher';
                            return (
                              <SelectItem key={t.id} value={t.id}>{name} ({t.employeeId || t.employee_id})</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => selectedTeacherId && linkTeacherMutation.mutate(selectedTeacherId)} disabled={!selectedTeacherId || linkTeacherMutation.isPending}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                  </div>
                </div>
              )}

              {(!subject.teachers || subject.teachers.length === 0) ? (
                <EmptyState title="No teachers linked" description="This subject is not assigned to any teacher yet." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subject.teachers.map((t: any) => {
                    const name = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim() || 'Teacher';
                    return (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{t.employeeId || t.employee_id}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => unlinkTeacherMutation.mutate(t.id)}>
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Students Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-green-500" /> Linked Direct Students
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkStudent(!showLinkStudent)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Link Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkStudent && (
                <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <Label className="text-xs font-medium">Select Student to Link Directly</Label>
                  <div className="flex gap-2">
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger className="flex-1 text-xs"><SelectValue placeholder="Choose student..." /></SelectTrigger>
                      <SelectContent>
                        {availableStudents.length === 0 ? (
                          <SelectItem value="_none" disabled>All students are already linked directly</SelectItem>
                        ) : (
                          availableStudents.map((s: any) => {
                            const name = `${s.firstName || s.first_name || ''} ${s.lastName || s.last_name || ''}`.trim() || 'Student';
                            return (
                              <SelectItem key={s.id} value={s.id}>{name} ({s.studentId || s.student_id})</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => selectedStudentId && linkStudentMutation.mutate(selectedStudentId)} disabled={!selectedStudentId || linkStudentMutation.isPending}>
                      <Link2 className="h-3.5 w-3.5 mr-1" /> Link
                    </Button>
                  </div>
                </div>
              )}

              {(!subject.students || subject.students.length === 0) ? (
                <EmptyState title="No direct students linked" description="No student is linked directly to this subject (students may also inherit subjects via their enrolled batches)." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subject.students.map((s: any) => {
                    const name = `${s.firstName || s.first_name || ''} ${s.lastName || s.last_name || ''}`.trim() || 'Student';
                    return (
                      <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{s.studentId || s.student_id}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => unlinkStudentMutation.mutate(s.id)}>
                          <Unlink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
