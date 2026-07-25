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
import { ArrowLeft, Pencil, GraduationCap, Users, BookOpen, Phone, Mail, MapPin, Calendar, User, FileText, Plus, Link2, Unlink } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import type { Student, Batch, Parent } from '@/lib/types';

interface StudentDetail extends Student {
  batches?: Batch[];
  parents?: Parent[];
}

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showLinkParent, setShowLinkParent] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');

  const { data: student, isLoading } = useQuery<StudentDetail, Error>({
    queryKey: ['student', params.id],
    queryFn: async () => {
      const res = await api.get<StudentDetail>(`/api/v1/students/${params.id}`);
      return res.data;
    },
  });

  const { data: availableParents } = useQuery<{ data: Parent[] }>({
    queryKey: ['parents-available'],
    queryFn: async () => {
      const res = await api.get<Parent[]>('/api/v1/parents?limit=100');
      return { data: res.data as Parent[] };
    },
    enabled: showLinkParent,
  });

  const linkParentMutation = useMutation({
    mutationFn: (parentId: string) => api.post(`/api/v1/students/${params.id}/link-parent`, { parentId }),
    onSuccess: () => {
      toast({ title: 'Parent linked successfully!' });
      setShowLinkParent(false);
      setSelectedParentId('');
      queryClient.invalidateQueries({ queryKey: ['student', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const unlinkParentMutation = useMutation({
    mutationFn: (parentId: string) => api.delete(`/api/v1/students/${params.id}/unlink-parent/${parentId}`),
    onSuccess: () => {
      toast({ title: 'Parent unlinked from student' });
      queryClient.invalidateQueries({ queryKey: ['student', params.id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading || !student) {
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

  const linkedParentIds = new Set(student.parents?.map((p: any) => p.id) || []);
  const linkableParents = (availableParents?.data || []).filter((p: any) => !linkedParentIds.has(p.id));

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/students')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Students
      </Button>

      <PageHeader title={`${student.firstName} ${student.lastName || ''}`} description={`Student ID: ${student.studentId || (student as any).student_id} · Admission: ${student.admissionNumber || (student as any).admission_number || '-'}`}>
        <Button onClick={() => router.push(`/institute-admin/students/${student.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Student
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Batches" value={student.batches?.length || 0} icon={BookOpen} color="blue" />
        <StatCard title="Parents" value={student.parents?.length || 0} icon={Users} color="green" />
        <StatCard title="Status" value={student.isActive ? 'Active' : 'Inactive'} icon={GraduationCap} color={student.isActive ? 'green' : 'gray'} />
        <StatCard title="Academic Year" value={student.academicYear || (student as any).academic_year || '-'} icon={Calendar} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center py-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <GraduationCap className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900">{student.firstName} {student.lastName}</p>
              <p className="text-sm text-slate-500">{student.studentId || (student as any).student_id}</p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={student.isActive ? 'active' : 'inactive'} />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Phone} label="Phone" value={student.phone} />
              <InfoRow icon={Phone} label="Alt Phone" value={student.altPhone || (student as any).alt_phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(student.dateOfBirth || (student as any).date_of_birth)} />
              <InfoRow icon={User} label="Gender" value={student.gender} />
              <InfoRow icon={MapPin} label="Address" value={student.address} />
              <InfoRow icon={Calendar} label="Admission Date" value={formatDate(student.admissionDate || (student as any).admission_date)} />
              <InfoRow icon={Calendar} label="Academic Year" value={student.academicYear || (student as any).academic_year} />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {/* Emergency Contact & Notes */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Emergency Contact & Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={User} label="Emergency Contact Name" value={student.emergencyContactName || (student as any).emergency_contact_name} />
                <InfoRow icon={Phone} label="Emergency Contact Phone" value={student.emergencyContactPhone || (student as any).emergency_contact_phone} />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Notes</p>
                    <p className="text-sm text-slate-700 mt-1">{student.notes || 'No notes available'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Batches */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-500" /> Assigned Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!student.batches || student.batches.length === 0) ? (
                <EmptyState title="No batches assigned" description="This student is not part of any batch yet." />
              ) : (
                <div className="space-y-2">
                  {student.batches.map((batch: Batch) => (
                    <div key={batch.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{batch.name}</p>
                        <p className="text-xs text-slate-500">{batch.code} · {batch.academicYear || (batch as any).academic_year || 'N/A'}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/batches/${batch.id}`)}>
                        View Batch
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parents / Guardians Section with Bidirectional Link Option */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" /> Parents / Guardians
                </CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowLinkParent(!showLinkParent)}>
                  <Plus className="h-4 w-4 mr-1" /> Link Parent
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showLinkParent && (
                <div className="mb-4 p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <Label className="mb-2 block">Select Parent / Guardian to Link</Label>
                  <div className="flex gap-2">
                    <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Choose parent..." /></SelectTrigger>
                      <SelectContent>
                        {linkableParents.length === 0 ? (
                          <SelectItem value="_none" disabled>All parents are already linked</SelectItem>
                        ) : (
                          linkableParents.map((p: any) => {
                            const name = `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.trim() || 'Parent';
                            const rel = p.relationship ? ` (${p.relationship})` : '';
                            const phone = p.phone ? ` - ${p.phone}` : '';
                            return (
                              <SelectItem key={p.id} value={p.id}>{name}{rel}{phone}</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => selectedParentId && linkParentMutation.mutate(selectedParentId)}
                      disabled={!selectedParentId || linkParentMutation.isPending}
                    >
                      <Link2 className="h-4 w-4 mr-1" /> Link
                    </Button>
                  </div>
                </div>
              )}

              {(!student.parents || student.parents.length === 0) ? (
                <EmptyState title="No parents linked" description="No parent or guardian is linked to this student." />
              ) : (
                <div className="space-y-2">
                  {student.parents.map((parent: any) => {
                    const name = `${parent.firstName || parent.first_name || ''} ${parent.lastName || parent.last_name || ''}`.trim() || 'Parent';
                    const rel = parent.relationship || 'Guardian';
                    const contact = parent.phone || parent.email || 'No contact';
                    return (
                      <div key={parent.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">{rel} · {contact}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/parents/${parent.id}`)}>
                            View Parent
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => unlinkParentMutation.mutate(parent.id)}
                            disabled={unlinkParentMutation.isPending}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
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
