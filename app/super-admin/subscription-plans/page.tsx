'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader, StatusBadge, FormDialog } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';

interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  monthly_price: number;
  annual_price: number;
  student_limit: number;
  teacher_limit: number;
  admin_limit: number;
  trial_duration_days: number;
  features: string | null;
  status: string;
}

export default function SubscriptionPlansPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Plan | null>(null);

  const { data, isLoading } = useQuery<{ data: Plan[] }>({
    queryKey: ['subscription-plans'],
    queryFn: async () => api.get('/api/v1/subscription-plans'),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/subscription-plans', body),
    onSuccess: () => {
      toast({ title: 'Plan created' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/v1/subscription-plans/${id}`, body),
    onSuccess: () => {
      toast({ title: 'Plan updated' });
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/v1/subscription-plans/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const plans = data?.data || [];

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Subscription Plans" description="Manage subscription plans available to institutes" />

      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="py-12 text-center text-slate-500">No subscription plans yet</CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: Plan) => (
            <Card key={plan.id} className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <StatusBadge status={plan.status} />
                </div>
                <p className="text-xs text-slate-500">{plan.code}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && <p className="text-sm text-slate-600">{plan.description}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-blue-50">
                    <p className="text-xs text-blue-600">Monthly</p>
                    <p className="font-bold text-blue-900">{formatCurrency(plan.monthly_price)}</p>
                  </div>
                  <div className="p-2 rounded bg-green-50">
                    <p className="text-xs text-green-600">Annual</p>
                    <p className="font-bold text-green-900">{formatCurrency(plan.annual_price)}</p>
                  </div>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Students: {plan.student_limit} · Teachers: {plan.teacher_limit} · Admins: {plan.admin_limit}</p>
                  <p>Trial: {plan.trial_duration_days} days</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditTarget(plan)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {plan.status === 'active' ? (
                    <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: plan.id, status: 'inactive' })}>
                      <XCircle className="h-3 w-3 mr-1" /> Deactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ id: plan.id, status: 'active' })}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PlanDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onSubmit={(body) => createMutation.mutate(body)}
        isSubmitting={createMutation.isPending}
        title="Add Subscription Plan"
      />

      <PlanDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        onSubmit={(body) => editTarget && updateMutation.mutate({ id: editTarget.id, body })}
        isSubmitting={updateMutation.isPending}
        title="Edit Subscription Plan"
        initial={editTarget || undefined}
      />
    </DashboardLayout>
  );
}

function PlanDialog({ open, onOpenChange, onSubmit, isSubmitting, title, initial }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
  title: string;
  initial?: Plan;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    description: initial?.description || '',
    monthlyPrice: initial?.monthly_price || 0,
    annualPrice: initial?.annual_price || 0,
    studentLimit: initial?.student_limit || 50,
    teacherLimit: initial?.teacher_limit || 10,
    adminLimit: initial?.admin_limit || 2,
    trialDurationDays: initial?.trial_duration_days || 14,
    features: initial?.features || '',
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={title} onSubmit={() => onSubmit(form)} submitLabel="Save" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5">
          <Label>Plan Name *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Plan Code *</Label>
          <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} disabled={!!initial} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Monthly Price</Label>
          <Input type="number" value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Annual Price</Label>
          <Input type="number" value={form.annualPrice} onChange={(e) => setForm({ ...form, annualPrice: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Student Limit</Label>
          <Input type="number" value={form.studentLimit} onChange={(e) => setForm({ ...form, studentLimit: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Teacher Limit</Label>
          <Input type="number" value={form.teacherLimit} onChange={(e) => setForm({ ...form, teacherLimit: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Admin Limit</Label>
          <Input type="number" value={form.adminLimit} onChange={(e) => setForm({ ...form, adminLimit: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="space-y-1.5">
          <Label>Trial Duration (days)</Label>
          <Input type="number" value={form.trialDurationDays} onChange={(e) => setForm({ ...form, trialDurationDays: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>Features (comma-separated)</Label>
          <Textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Feature 1, Feature 2, ..." />
        </div>
      </div>
    </FormDialog>
  );
}
