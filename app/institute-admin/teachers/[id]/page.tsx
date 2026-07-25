'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Pencil, Users, BookOpen, Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, FileText, Plus, Link2, Unlink } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { Teacher, Batch, Subject } from '@/lib/types';

interface TeacherDetail extends Teacher {
  batches?: Batch[];
  subjects?: Subject[];
}

export default function TeacherDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLinkSubject, setShowLinkSubject] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');

  const { data: teacher, isLoading } = useQuery<TeacherDetail, Error>({
    queryKey: ['teacher', params.id],
    queryFn: async () => {
      const res = await api.get<TeacherDetail>(`/api/v1/teachers/${params.id}`);
      return res.data;
    },
  });

  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const { data: availableSubjects } = useQuery<Subject[]>({
    queryKey: ['subjects-available'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/subjects?limit=200');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: showLinkSubject,
  });

  const linkSubjectMutation = useMutation({
    mutationFn: (subjectIds: string[]) => api.post(`/api/v1/teachers/${params.id}/subjects`, { subjectIds }),
    onSuccess: () => {
      toast({ title: 'Subjects assigned to teacher successfully!' });
      setShowLinkSubject(false);
      setSelectedSubjectIds([]);
      queryClient.invalidateQueries({ queryKey: ['teacher', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkSubjectMutation = useMutation({
    mutationFn: (subjectId: string) => api.delete(`/api/v1/teachers/${params.id}/subjects?subjectId=${subjectId}`),
    onSuccess: () => {
      toast({ title: 'Subject unlinked from teacher' });
      queryClient.invalidateQueries({ queryKey: ['teacher', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading || !teacher) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-64 bg-slate-100 rounded-lg animate-pulse" />
            <div className="lg:col-span-2 h-64 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const linkedSubjectIds = new Set(teacher.subjects?.map((s: any) => s.id) || []);
  const linkableSubjects = (availableSubjects || []).filter((s: any) => !linkedSubjectIds.has(s.id));

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/teachers')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Teachers
      </Button>

      <PageHeader title={`${teacher.firstName} ${teacher.lastName || ''}`} description={`Employee ID: ${teacher.employeeId}`}>
        <Button onClick={() => router.push(`/institute-admin/teachers/${teacher.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Teacher
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Assigned Batches" value={teacher.batches?.length || 0} icon={BookOpen} color="blue" />
        <StatCard title="Assigned Subjects" value={teacher.subjects?.length || 0} icon={GraduationCap} color="purple" />
        <StatCard title="Status" value={teacher.isActive ? 'Active' : 'Inactive'} icon={Users} color={teacher.isActive ? 'green' : 'gray'} />
        <StatCard title="Joined On" value={formatDate(teacher.joiningDate)} icon={Calendar} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">{teacher.firstName} {teacher.lastName}</p>
              <p className="text-sm text-slate-500">{teacher.employeeId}</p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={teacher.isActive ? 'active' : 'inactive'} />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <InfoRow icon={Mail} label="Email" value={teacher.email} />
              <InfoRow icon={Phone} label="Phone" value={teacher.phone} />
              <InfoRow icon={Phone} label="Alt Phone" value={teacher.altPhone} />
              <InfoRow icon={Briefcase} label="Qualification" value={teacher.qualification} />
              <InfoRow icon={GraduationCap} label="Specialization" value={teacher.specialization} />
              <InfoRow icon={Calendar} label="Joining Date" value={formatDate(teacher.joiningDate)} />
              <InfoRow icon={MapPin} label="Address" value={teacher.address} />
            </div>
            {teacher.notes && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Notes</p>
                    <p className="text-sm text-slate-700 mt-1">{teacher.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Assigned Batches */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" /> Assigned Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!teacher.batches || teacher.batches.length === 0) ? (
                <EmptyState title="No batches assigned" description="This teacher is not assigned to any batch yet." />
              ) : (
                <div className="space-y-2">
                  {teacher.batches.map((batch: Batch) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{batch.name}</p>
                        <p className="text-xs text-slate-500">{batch.code} · {batch.academicYear || 'N/A'}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/batches/${batch.id}`)}>View Batch</Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Subjects */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-purple-500" /> Assigned Subjects
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkSubject(!showLinkSubject)}>
                  <Plus className="h-4 w-4 mr-1" /> Assign Subject
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkSubject && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <Label className="mb-2 block text-xs font-medium">Select Subject to Assign</Label>
                  <div className="flex gap-2">
                    <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Choose subject..." /></SelectTrigger>
                      <SelectContent>
                        {linkableSubjects.length === 0 ? (
                          <SelectItem value="_none" disabled>All subjects are already assigned</SelectItem>
                        ) : (
                          linkableSubjects.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => selectedSubjectId && linkSubjectMutation.mutate([selectedSubjectId])}
                      disabled={!selectedSubjectId || linkSubjectMutation.isPending}
                    >
                      <Link2 className="h-4 w-4 mr-1" /> Assign
                    </Button>
                  </div>
                </div>
              )}

              {(!teacher.subjects || teacher.subjects.length === 0) ? (
                <EmptyState title="No subjects assigned" description="This teacher is not assigned to any subject yet." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teacher.subjects.map((subject: any) => (
                    <div key={subject.id} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                        <p className="text-xs text-slate-500">{subject.code} · Max: {subject.maxMarks ?? subject.max_marks ?? 100} · Pass: {subject.passingMarks ?? subject.passing_marks ?? 40}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => unlinkSubjectMutation.mutate(subject.id)}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
