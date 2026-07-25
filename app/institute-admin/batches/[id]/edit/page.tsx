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
import type { Batch } from '@/lib/types';

interface BatchFormData {
  name: string;
  code: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  capacity: string;
  description: string;
}

const EMPTY_FORM: BatchFormData = {
  name: '', code: '', academicYear: '', startDate: '', endDate: '', startTime: '', endTime: '', capacity: '30', description: '',
};

function toForm(b: Batch): BatchFormData {
  return {
    name: b.name || '',
    code: b.code || '',
    academicYear: b.academicYear || '',
    startDate: b.startDate ? b.startDate.split('T')[0] : '',
    endDate: b.endDate ? b.endDate.split('T')[0] : '',
    startTime: b.startTime || '',
    endTime: b.endTime || '',
    capacity: String(b.capacity || 30),
    description: b.description || '',
  };
}

export default function EditBatchPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<BatchFormData>(EMPTY_FORM);

  const { data: batch, isLoading } = useQuery<Batch, Error>({
    queryKey: ['batch', params.id],
    queryFn: async () => {
      const res = await api.get<Batch>(`/api/v1/batches/${params.id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (batch) setForm(toForm(batch));
  }, [batch]);

  const updateMutation = useMutation({
    mutationFn: (body: BatchFormData) => api.put(`/api/v1/batches/${params.id}`, body),
    onSuccess: () => {
      toast({ title: 'Batch updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['batch', params.id] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      router.push(`/institute-admin/batches/${params.id}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function set<K extends keyof BatchFormData>(key: K, value: BatchFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading || !batch) {
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
      <Button variant="ghost" size="sm" onClick={() => router.push(`/institute-admin/batches/${params.id}`)} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Batch
      </Button>

      <PageHeader title="Edit Batch" description={`Update information for ${batch.name} (${batch.code})`} />

      <Card className="border-slate-200 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Basic</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set('code', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => set('academicYear', e.target.value)} placeholder="2025-2026" /></div>
                <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Schedule</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => router.push(`/institute-admin/batches/${params.id}`)}>Cancel</Button>
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
