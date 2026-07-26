'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function EditInstitutePage() {
  const params = useParams();
  const id = params?.id as string;
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ data: Record<string, unknown> }>({
    queryKey: ['institute', id],
    queryFn: async () => api.get(`/api/v1/institutes/${id}`),
    enabled: Boolean(id),
  });

  const [form, setForm] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (data?.data) {
      const d = data.data as any;
      setForm({
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        altPhone: d.altPhone || d.alt_phone || '',
        address: d.address || '',
        city: d.city || '',
        stateRegion: d.stateRegion || d.state_region || '',
        country: d.country || 'India',
        postalCode: d.postalCode || d.postal_code || '',
        contactPersonName: d.contactPersonName || d.contact_person_name || '',
        contactPersonPhone: d.contactPersonPhone || d.contact_person_phone || '',
        contactPersonEmail: d.contactPersonEmail || d.contact_person_email || '',
        studentLimit: d.studentLimit ?? d.student_limit ?? 100,
        teacherLimit: d.teacherLimit ?? d.teacher_limit ?? 20,
        adminLimit: d.adminLimit ?? d.admin_limit ?? 3,
        notes: d.notes || '',
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put(`/api/v1/institutes/${id}`, body),
    onSuccess: () => {
      toast({ title: 'Institute updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['institute', id] });
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
      router.push(`/super-admin/institutes/${id}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <DashboardLayout navSections={superAdminNav} role="super_admin">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <PageHeader title="Edit Institute" description="Update institute information" />

      <Card className="border-slate-200 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Institute Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Institute Name *</Label>
              <Input value={form.name as string || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email as string || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone as string || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Alt Phone</Label>
              <Input value={form.altPhone as string || ''} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address as string || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city as string || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>State/Region</Label>
              <Input value={form.stateRegion as string || ''} onChange={(e) => setForm({ ...form, stateRegion: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Country</Label>
              <Input value={form.country as string || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input value={form.postalCode as string || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Person</Label>
              <Input value={form.contactPersonName as string || ''} onChange={(e) => setForm({ ...form, contactPersonName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={form.contactPersonPhone as string || ''} onChange={(e) => setForm({ ...form, contactPersonPhone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={form.contactPersonEmail as string || ''} onChange={(e) => setForm({ ...form, contactPersonEmail: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Student Limit</Label>
              <Input type="number" value={form.studentLimit as number || 0} onChange={(e) => setForm({ ...form, studentLimit: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Teacher Limit</Label>
              <Input type="number" value={form.teacherLimit as number || 0} onChange={(e) => setForm({ ...form, teacherLimit: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Limit</Label>
              <Input type="number" value={form.adminLimit as number || 0} onChange={(e) => setForm({ ...form, adminLimit: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes as string || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={() => updateMutation.mutate(form)} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
