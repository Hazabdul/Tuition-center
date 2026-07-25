'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Teacher } from '@/lib/types';

interface TeacherFormData {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  qualification: string;
  specialization: string;
  joiningDate: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: TeacherFormData = {
  employeeId: '', firstName: '', lastName: '', email: '', phone: '', qualification: '', specialization: '', joiningDate: '', address: '', notes: '',
};

function toForm(t: Teacher): TeacherFormData {
  return {
    employeeId: t.employeeId || '',
    firstName: t.firstName || '',
    lastName: t.lastName || '',
    email: t.email || '',
    phone: t.phone || '',
    qualification: t.qualification || '',
    specialization: t.specialization || '',
    joiningDate: t.joiningDate ? t.joiningDate.split('T')[0] : '',
    address: t.address || '',
    notes: t.notes || '',
  };
}

export default function EditTeacherPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<TeacherFormData>(EMPTY_FORM);

  const { data: teacher, isLoading } = useQuery<Teacher, Error>({
    queryKey: ['teacher', params.id],
    queryFn: async () => {
      const res = await api.get<Teacher>(`/api/v1/teachers/${params.id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (teacher) setForm(toForm(teacher));
  }, [teacher]);

  const updateMutation = useMutation({
    mutationFn: (body: TeacherFormData) => api.put(`/api/v1/teachers/${params.id}`, body),
    onSuccess: () => {
      toast({ title: 'Teacher updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['teacher', params.id] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      router.push(`/institute-admin/teachers/${params.id}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function set<K extends keyof TeacherFormData>(key: K, value: TeacherFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading || !teacher) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-96 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push(`/institute-admin/teachers/${params.id}`)} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Teacher
      </Button>

      <PageHeader title="Edit Teacher" description={`Update information for ${teacher.firstName} ${teacher.lastName || ''}`} />

      <Card className="border-slate-200 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Teacher Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Identification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Employee ID *</Label><Input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Joining Date *</Label><Input type="date" value={form.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                <div className="sm:col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Professional</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => set('qualification', e.target.value)} placeholder="M.Sc, B.Ed" /></div>
                <div className="space-y-1.5"><Label>Specialization</Label><Input value={form.specialization} onChange={(e) => set('specialization', e.target.value)} placeholder="Mathematics" /></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => router.push(`/institute-admin/teachers/${params.id}`)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
