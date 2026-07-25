'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2, Save, BookOpen, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { Subject } from '@/lib/types';

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

function toForm(s: Subject): SubjectFormData {
  return {
    name: s.name || '',
    code: s.code || '',
    description: s.description || '',
    maxMarks: String(s.maxMarks || 100),
    passingMarks: String(s.passingMarks || 40),
  };
}

export default function EditSubjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SubjectFormData>(EMPTY_FORM);

  const { data: subject, isLoading } = useQuery<Subject, Error>({
    queryKey: ['subject', params.id],
    queryFn: async () => {
      const res = await api.get<Subject>(`/api/v1/subjects/${params.id}`);
      return res.data;
    },
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
      router.push('/institute-admin/subjects');
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

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/subjects')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Subjects
      </Button>

      <PageHeader title="Edit Subject" description={`Update ${subject.name} (${subject.code})`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <div className="space-y-4">
          <StatCard title="Max Marks" value={subject.maxMarks} icon={BookOpen} color="blue" />
          <StatCard title="Passing Marks" value={subject.passingMarks} icon={BookOpen} color="amber" />
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">Status</span>
                <StatusBadge status={subject.isActive ? 'active' : 'inactive'} />
              </div>
              {subject.description && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600">{subject.description}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Subject Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
                  <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set('code', e.target.value)} required /></div>
                  <div className="space-y-1.5"><Label>Max Marks</Label><Input type="number" value={form.maxMarks} onChange={(e) => set('maxMarks', e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Passing Marks</Label><Input type="number" value={form.passingMarks} onChange={(e) => set('passingMarks', e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
                </div>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => router.push('/institute-admin/subjects')}>Cancel</Button>
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
