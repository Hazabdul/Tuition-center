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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Student } from '@/lib/types';

interface StudentFormData {
  studentId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phone: string;
  altPhone: string;
  address: string;
  academicYear: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  username: string;
  password: string;
}

const EMPTY_FORM: StudentFormData = {
  studentId: '', admissionNumber: '', firstName: '', lastName: '', dateOfBirth: '', gender: '', email: '', phone: '', altPhone: '', address: '', academicYear: '', emergencyContactName: '', emergencyContactPhone: '', notes: '', username: '', password: '',
};

function toForm(s: any): StudentFormData {
  return {
    studentId: s.studentId || s.student_id || '',
    admissionNumber: s.admissionNumber || s.admission_number || '',
    firstName: s.firstName || s.first_name || '',
    lastName: s.lastName || s.last_name || '',
    dateOfBirth: (s.dateOfBirth || s.date_of_birth) ? (s.dateOfBirth || s.date_of_birth).split('T')[0] : '',
    gender: s.gender || '',
    email: s.email || '',
    phone: s.phone || '',
    altPhone: s.altPhone || s.alt_phone || '',
    address: s.address || '',
    academicYear: s.academicYear || s.academic_year || '',
    emergencyContactName: s.emergencyContactName || s.emergency_contact_name || '',
    emergencyContactPhone: s.emergencyContactPhone || s.emergency_contact_phone || '',
    notes: s.notes || '',
    username: s.user?.username || '',
    password: '',
  };
}

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id || '';
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<StudentFormData>(EMPTY_FORM);

  const { data: student, isLoading } = useQuery<Student, Error>({
    queryKey: ['student', id],
    queryFn: async () => {
      const res = await api.get<Student>(`/api/v1/students/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (student) setForm(toForm(student));
  }, [student]);

  const updateMutation = useMutation({
    mutationFn: (body: StudentFormData) => api.put(`/api/v1/students/${params.id}`, body),
    onSuccess: () => {
      toast({ title: 'Student updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['student', params.id] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      router.push(`/institute-admin/students/${params.id}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function set<K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading || !student) {
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
      <Button variant="ghost" size="sm" onClick={() => router.push(`/institute-admin/students/${params.id}`)} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Student
      </Button>

      <PageHeader title="Edit Student" description={`Update information for ${student.firstName} ${student.lastName || ''}`} />

      <Card className="border-slate-200 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Identification</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Student ID *</Label><Input value={form.studentId} onChange={(e) => set('studentId', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Admission Number *</Label><Input value={form.admissionNumber} onChange={(e) => set('admissionNumber', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => set('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Alt Phone</Label><Input value={form.altPhone} onChange={(e) => set('altPhone', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="2025-2026" /></div>
                <div className="sm:col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Login Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-lg border border-slate-200/80">
                <div className="space-y-1.5">
                  <Label>Student Username</Label>
                  <Input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="e.g. STU001 or student.name" />
                </div>
                <div className="space-y-1.5">
                  <Label>{form.username ? 'Set / Reset Password' : 'Password'}</Label>
                  <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder={form.username ? 'Leave blank to keep existing' : 'Min 6 characters'} />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Emergency Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Emergency Contact Name</Label><Input value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Emergency Contact Phone</Label><Input value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} /></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => router.push(`/institute-admin/students/${params.id}`)}>Cancel</Button>
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
