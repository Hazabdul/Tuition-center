'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Pencil, Users, Mail, Phone, MapPin, Briefcase, FileText, Link2, Unlink, Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Parent, Student } from '@/lib/types';

interface ParentDetail extends Parent {
  children?: Student[];
}

export default function ParentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLink, setShowLink] = useState(false);
  const [linkStudentId, setLinkStudentId] = useState('');

  const { data: parent, isLoading } = useQuery<ParentDetail, Error>({
    queryKey: ['parent', params.id],
    queryFn: async () => {
      const res = await api.get<ParentDetail>(`/api/v1/parents/${params.id}`);
      return res.data;
    },
  });

  const { data: availableStudents } = useQuery<{ data: Student[] }>({
    queryKey: ['students-available'],
    queryFn: async () => {
      const res = await api.get<Student[]>('/api/v1/students?limit=100');
      return { data: res.data as Student[] };
    },
  });

  const linkMutation = useMutation({
    mutationFn: (studentId: string) => api.post(`/api/v1/parents/${params.id}/link-student`, { studentId }),
    onSuccess: () => {
      toast({ title: 'Student linked successfully' });
      setShowLink(false);
      setLinkStudentId('');
      queryClient.invalidateQueries({ queryKey: ['parent', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkMutation = useMutation({
    mutationFn: (studentId: string) => api.delete(`/api/v1/parents/${params.id}/unlink-student/${studentId}`),
    onSuccess: () => {
      toast({ title: 'Student unlinked' });
      queryClient.invalidateQueries({ queryKey: ['parent', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading || !parent) {
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

  const linkedIds = new Set(parent.children?.map((c: Student) => c.id) || []);
  const linkableStudents = availableStudents?.data?.filter((s: Student) => !linkedIds.has(s.id)) || [];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/parents')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Parents
      </Button>

      <PageHeader title={`${parent.firstName} ${parent.lastName || ''}`} description={parent.relationship || 'Guardian'}>
        <Button onClick={() => router.push(`/institute-admin/parents/${parent.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Parent
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Children" value={parent.children?.length || 0} icon={Users} color="blue" />
        <StatCard title="Status" value={parent.isActive ? 'Active' : 'Inactive'} icon={Users} color={parent.isActive ? 'green' : 'gray'} />
        <StatCard title="Occupation" value={parent.occupation || '-'} icon={Briefcase} color="amber" />
        <StatCard title="Relationship" value={parent.relationship || '-'} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <Users className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">{parent.firstName} {parent.lastName}</p>
              <p className="text-sm text-slate-500">{parent.relationship || 'Guardian'}</p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={parent.isActive ? 'active' : 'inactive'} />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <InfoRow icon={Mail} label="Email" value={parent.email} />
              <InfoRow icon={Phone} label="Phone" value={parent.phone} />
              <InfoRow icon={Phone} label="Alt Phone" value={parent.altPhone} />
              <InfoRow icon={Briefcase} label="Occupation" value={parent.occupation} />
              <InfoRow icon={MapPin} label="Address" value={parent.address} />
            </div>
            {parent.notes && (
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Notes</p>
                    <p className="text-sm text-slate-700 mt-1">{parent.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Linked Children */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" /> Linked Children
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLink(!showLink)}>
                  <Plus className="h-4 w-4 mr-1" /> Link Student
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLink && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <Label className="mb-2 block">Select Student to Link</Label>
                  <div className="flex gap-2">
                    <Select value={linkStudentId} onValueChange={setLinkStudentId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select a student" /></SelectTrigger>
                      <SelectContent>
                        {linkableStudents.length === 0 ? (
                          <SelectItem value="_none" disabled>All students are already linked</SelectItem>
                        ) : (
                          linkableStudents.map((s: any) => {
                            const name = `${s.firstName || s.first_name || ''} ${s.lastName || s.last_name || ''}`.trim() || 'Student';
                            const code = s.studentId || s.student_id || s.id;
                            return (
                              <SelectItem key={s.id} value={s.id}>{name} ({code})</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => linkStudentId && linkMutation.mutate(linkStudentId)}
                      disabled={!linkStudentId || linkMutation.isPending}
                    >
                      <Link2 className="h-4 w-4 mr-1" /> Link
                    </Button>
                  </div>
                </div>
              )}

              {(!parent.children || parent.children.length === 0) ? (
                <EmptyState title="No children linked" description="No students are linked to this parent yet." />
              ) : (
                <div className="space-y-2">
                  {parent.children.map((child: any) => {
                    const name = `${child.firstName || child.first_name || ''} ${child.lastName || child.last_name || ''}`.trim() || 'Student';
                    const code = child.studentId || child.student_id || '-';
                    return (
                      <div key={child.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{name}</p>
                            <p className="text-xs text-slate-500">{code} · {child.academicYear || child.academic_year || 'N/A'}</p>
                          </div>
                        </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/students/${child.id}`)}>View</Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => unlinkMutation.mutate(child.id)}
                          disabled={unlinkMutation.isPending}
                        >
                          <Unlink className="h-4 w-4" />
                        </Button>
                      </div>
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
