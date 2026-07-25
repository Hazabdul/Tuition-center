'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Pencil, Users, GraduationCap, BookOpen, Calendar, Clock, FileText, Plus, Trash2, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { Batch, Student, Teacher, Subject } from '@/lib/types';

interface BatchDetail extends Batch {
  students?: Student[];
  teachers?: Teacher[];
  subjects?: Subject[];
}

type TabKey = 'students' | 'teachers' | 'subjects';

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('students');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const { data: batch, isLoading } = useQuery<BatchDetail, Error>({
    queryKey: ['batch', id],
    queryFn: async () => {
      const res = await api.get<BatchDetail>(`/api/v1/batches/${id}`);
      return res.data;
    },
  });

  const { data: allStudents } = useQuery<Student[]>({
    queryKey: ['all-students-picker'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/students?limit=200');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: showAddStudent,
  });

  const { data: allTeachers } = useQuery<Teacher[]>({
    queryKey: ['all-teachers-picker'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/teachers?limit=200');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: showAddTeacher,
  });

  const { data: allSubjects } = useQuery<Subject[]>({
    queryKey: ['all-subjects-picker'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/subjects?limit=200');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: showAddSubject,
  });

  const assignSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => api.post(`/api/v1/batches/${id}/subjects`, { subjectId }),
    onSuccess: () => {
      toast({ title: 'Subject assigned to batch successfully!' });
      setShowAddSubject(false);
      setSelectedSubjectId('');
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unassignSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => api.delete(`/api/v1/batches/${id}/subjects?subjectId=${subjectId}`),
    onSuccess: () => {
      toast({ title: 'Subject unlinked from batch' });
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const enrollStudentMutation = useMutation({
    mutationFn: (studentId: string) => api.post(`/api/v1/batches/${id}/students`, { studentId }),
    onSuccess: () => {
      toast({ title: 'Student enrolled in batch successfully!' });
      setShowAddStudent(false);
      setSelectedStudentId('');
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unenrollStudentMutation = useMutation({
    mutationFn: (studentId: string) => api.delete(`/api/v1/batches/${id}/students?studentId=${studentId}`),
    onSuccess: () => {
      toast({ title: 'Student unenrolled from batch' });
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const assignTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => api.post(`/api/v1/batches/${id}/teachers`, { teacherId }),
    onSuccess: () => {
      toast({ title: 'Teacher assigned to batch successfully!' });
      setShowAddTeacher(false);
      setSelectedTeacherId('');
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unassignTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => api.delete(`/api/v1/batches/${id}/teachers?teacherId=${teacherId}`),
    onSuccess: () => {
      toast({ title: 'Teacher unassigned from batch' });
      queryClient.invalidateQueries({ queryKey: ['batch', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading || !batch) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'students', label: 'Students', count: batch.students?.length || 0, icon: GraduationCap },
    { key: 'teachers', label: 'Teachers', count: batch.teachers?.length || 0, icon: Users },
    { key: 'subjects', label: 'Subjects', count: batch.subjects?.length || 0, icon: BookOpen },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/batches')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Batches
      </Button>

      <PageHeader title={batch.name} description={`Code: ${batch.code} · ${batch.academicYear || 'N/A'}`}>
        <Button onClick={() => router.push(`/institute-admin/batches/${batch.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Batch
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Students" value={batch.students?.length || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Teachers" value={batch.teachers?.length || 0} icon={Users} color="green" />
        <StatCard title="Subjects" value={batch.subjects?.length || 0} icon={BookOpen} color="purple" />
        <StatCard title="Capacity" value={batch.capacity} icon={Users} color="amber" />
      </div>

      {/* Batch Info */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow icon={Calendar} label="Start Date" value={batch.startDate ? formatDate(batch.startDate) : null} />
            <InfoRow icon={Calendar} label="End Date" value={batch.endDate ? formatDate(batch.endDate) : null} />
            <InfoRow icon={Clock} label="Timing" value={batch.startTime && batch.endTime ? `${batch.startTime} - ${batch.endTime}` : null} />
            <InfoRow icon={Users} label="Capacity" value={String(batch.capacity)} />
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow icon={FileText} label="Description" value={batch.description} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <StatusBadge status={batch.isActive ? 'active' : 'inactive'} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-0 flex flex-row items-center justify-between">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab Action Buttons */}
          <div>
            {activeTab === 'students' && (
              <Button size="sm" onClick={() => setShowAddStudent(true)} className="bg-blue-600 hover:bg-blue-700 text-xs">
                <UserPlus className="h-4 w-4 mr-1.5" /> Enroll Student
              </Button>
            )}
            {activeTab === 'teachers' && (
              <Button size="sm" onClick={() => setShowAddTeacher(true)} className="bg-green-600 hover:bg-green-700 text-xs">
                <UserPlus className="h-4 w-4 mr-1.5" /> Assign Teacher
              </Button>
            )}
            {activeTab === 'subjects' && (
              <Button size="sm" onClick={() => setShowAddSubject(true)} className="bg-purple-600 hover:bg-purple-700 text-xs">
                <Plus className="h-4 w-4 mr-1.5" /> Assign Subject
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {activeTab === 'students' && (
            (!batch.students || batch.students.length === 0) ? (
              <EmptyState title="No students enrolled" description="No students are assigned to this batch yet." action={
                <Button size="sm" onClick={() => setShowAddStudent(true)}><UserPlus className="h-4 w-4 mr-1.5" /> Enroll Student</Button>
              } />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Student ID</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.students.map((student: any) => {
                      const name = `${student.firstName || student.first_name || ''} ${student.lastName || student.last_name || ''}`.trim() || 'Student';
                      const code = student.studentId || student.student_id || '-';
                      const active = student.isActive ?? student.is_active ?? true;
                      return (
                        <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{code}</td>
                          <td className="px-4 py-3 text-slate-500">{student.email || student.phone || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={active ? 'active' : 'inactive'} /></td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/students/${student.id}`)}>View</Button>
                            <Button variant="ghost" size="sm" onClick={() => unenrollStudentMutation.mutate(student.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'teachers' && (
            (!batch.teachers || batch.teachers.length === 0) ? (
              <EmptyState title="No teachers assigned" description="No teachers are assigned to this batch yet." action={
                <Button size="sm" onClick={() => setShowAddTeacher(true)} className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-1.5" /> Assign Teacher</Button>
              } />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Teacher</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Employee ID</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Specialization</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.teachers.map((teacher: any) => {
                      const name = `${teacher.firstName || teacher.first_name || ''} ${teacher.lastName || teacher.last_name || ''}`.trim() || 'Teacher';
                      const code = teacher.employeeId || teacher.employee_id || '-';
                      const active = teacher.isActive ?? teacher.is_active ?? true;
                      return (
                        <tr key={teacher.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">{name}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{code}</td>
                          <td className="px-4 py-3 text-slate-500">{teacher.specialization || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={active ? 'active' : 'inactive'} /></td>
                          <td className="px-4 py-3 text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/teachers/${teacher.id}`)}>View</Button>
                            <Button variant="ghost" size="sm" onClick={() => unassignTeacherMutation.mutate(teacher.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'subjects' && (
            (!batch.subjects || batch.subjects.length === 0) ? (
              <EmptyState title="No subjects assigned" description="No subjects are assigned to this batch yet." action={
                <Button size="sm" onClick={() => setShowAddSubject(true)} className="bg-purple-600 hover:bg-purple-700"><Plus className="h-4 w-4 mr-1.5" /> Assign Subject</Button>
              } />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {batch.subjects.map((subject: any) => (
                  <div key={subject.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                      <p className="text-xs text-slate-500">{subject.code}</p>
                      <div className="mt-2 text-xs text-slate-500">
                        <span>Max: {subject.maxMarks ?? subject.max_marks ?? 100}</span> · <span>Pass: {subject.passingMarks ?? subject.passing_marks ?? 40}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => unassignSubjectMutation.mutate(subject.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* Enroll Student Dialog */}
      <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span>Enroll Student into {batch.name}</span>
            </DialogTitle>
            <DialogDescription>Select a student from your institute directory to enroll</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-xs">Select Student *</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose student..." />
              </SelectTrigger>
              <SelectContent>
                {(allStudents || [])
                  .filter((st: any) => !batch.students?.some((bs: any) => bs.id === st.id))
                  .map((st: any) => {
                    const name = `${st.firstName || st.first_name || ''} ${st.lastName || st.last_name || ''}`.trim() || 'Student';
                    const code = st.studentId || st.student_id || st.id;
                    return (
                      <SelectItem key={st.id} value={st.id}>
                        {name} ({code})
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedStudentId && enrollStudentMutation.mutate(selectedStudentId)}
              disabled={!selectedStudentId || enrollStudentMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {enrollStudentMutation.isPending ? 'Enrolling...' : 'Enroll Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={showAddTeacher} onOpenChange={setShowAddTeacher}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Assign Teacher to {batch.name}</span>
            </DialogTitle>
            <DialogDescription>Select a teacher from your institute faculty roster to assign</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-xs">Select Teacher *</Label>
            <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose teacher..." />
              </SelectTrigger>
              <SelectContent>
                {(allTeachers || [])
                  .filter((t: any) => !batch.teachers?.some((bt: any) => bt.id === t.id))
                  .map((t: any) => {
                    const name = `${t.firstName || t.first_name || ''} ${t.lastName || t.last_name || ''}`.trim() || 'Teacher';
                    const code = t.employeeId || t.employee_id || t.id;
                    const spec = t.specialization ? ` - ${t.specialization}` : '';
                    return (
                      <SelectItem key={t.id} value={t.id}>
                        {name} ({code}{spec})
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedTeacherId && assignTeacherMutation.mutate(selectedTeacherId)}
              disabled={!selectedTeacherId || assignTeacherMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {assignTeacherMutation.isPending ? 'Assigning...' : 'Assign Teacher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Subject Dialog */}
      <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <span>Assign Subject to {batch.name}</span>
            </DialogTitle>
            <DialogDescription>Select an academic subject to assign to this batch</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label className="text-xs">Select Subject *</Label>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose subject..." />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const list = Array.isArray(allSubjects) ? allSubjects : [];
                  const available = list.filter((s: any) => !batch.subjects?.some((bs: any) => bs.id === s.id));
                  if (available.length === 0) {
                    return <SelectItem value="_none" disabled>No unassigned subjects available</SelectItem>;
                  }
                  return available.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedSubjectId && assignSubjectMutation.mutate(selectedSubjectId)}
              disabled={!selectedSubjectId || assignSubjectMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {assignSubjectMutation.isPending ? 'Assigning...' : 'Assign Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
