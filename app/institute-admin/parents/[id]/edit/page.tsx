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
import type { Parent } from '@/lib/types';

interface ParentFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  altPhone: string;
  address: string;
  relationship: string;
  occupation: string;
  notes: string;
}

const EMPTY_FORM: ParentFormData = {
  firstName: '', lastName: '', email: '', phone: '', altPhone: '', address: '', relationship: '', occupation: '', notes: '',
};

function toForm(p: Parent): ParentFormData {
  return {
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    email: p.email || '',
    phone: p.phone || '',
    altPhone: p.altPhone || '',
    address: p.address || '',
    relationship: p.relationship || '',
    occupation: p.occupation || '',
    notes: p.notes || '',
  };
}

export default function EditParentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<ParentFormData>(EMPTY_FORM);

  const { data: parent, isLoading } = useQuery<Parent, Error>({
    queryKey: ['parent', params.id],
    queryFn: async () => {
      const res = await api.get<Parent>(`/api/v1/parents/${params.id}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (parent) setForm(toForm(parent));
  }, [parent]);

  const updateMutation = useMutation({
    mutationFn: (body: ParentFormData) => api.put(`/api/v1/parents/${params.id}`, body),
    onSuccess: () => {
      toast({ title: 'Parent updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['parent', params.id] });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      router.push(`/institute-admin/parents/${params.id}`);
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function set<K extends keyof ParentFormData>(key: K, value: ParentFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (isLoading || !parent) {
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
      <Button variant="ghost" size="sm" onClick={() => router.push(`/institute-admin/parents/${params.id}`)} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Parent
      </Button>

      <PageHeader title="Edit Parent" description={`Update information for ${parent.firstName} ${parent.lastName || ''}`} />

      <Card className="border-slate-200 shadow-sm max-w-3xl">
        <CardHeader>
          <CardTitle className="text-lg">Parent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Personal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} /></div>
                <div className="space-y-1.5">
                  <Label>Relationship</Label>
                  <Select value={form.relationship} onValueChange={(v) => set('relationship', v)}>
                    <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="grandparent">Grandparent</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} /></div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Alt Phone</Label><Input value={form.altPhone} onChange={(e) => set('altPhone', e.target.value)} /></div>
                <div className="sm:col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => router.push(`/institute-admin/parents/${params.id}`)}>Cancel</Button>
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
