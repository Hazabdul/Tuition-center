'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { DataTable, type Column, StatusBadge, PageHeader, FormDialog } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Plus, RefreshCw, Ban, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

interface SubRow {
  id: string;
  status: string;
  start_date: string;
  expiry_date: string;
  institute: { id: string; name: string; code: string; status: string } | null;
  plan: { id: string; name: string; code: string } | null;
}

export default function SubscriptionsPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [renewTarget, setRenewTarget] = useState<SubRow | null>(null);

  const { data, isLoading } = useQuery<{ data: SubRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['subscriptions', page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<SubRow[]>(`/api/v1/subscriptions?${params}`);
      return { data: res.data as SubRow[], pagination: res.pagination! };
    },
  });

  const { data: plansData } = useQuery<{ data: Array<{ id: string; name: string }> }>({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name: string }>>('/api/v1/subscription-plans');
      return { data: res.data as Array<{ id: string; name: string }> };
    },
  });

  const { data: institutesData } = useQuery<{ data: Array<{ id: string; name: string; code: string }> }>({
    queryKey: ['institutes-all'],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name: string; code: string }>>('/api/v1/institutes?page=1&limit=100');
      return { data: res.data as Array<{ id: string; name: string; code: string }> };
    },
  });

  const assignMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/subscriptions', body),
    onSuccess: () => {
      toast({ title: 'Subscription assigned' });
      setShowAssign(false);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.post(`/api/v1/subscriptions/${id}/renew`, body),
    onSuccess: () => {
      toast({ title: 'Subscription renewed' });
      setRenewTarget(null);
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/subscriptions/${id}/suspend`, {}),
    onSuccess: () => {
      toast({ title: 'Subscription suspended' });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/v1/subscriptions/${id}/cancel`, {}),
    onSuccess: () => {
      toast({ title: 'Subscription cancelled' });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<SubRow>[] = [
    {
      key: 'institute',
      header: 'Institute',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.institute?.name || 'N/A'}</p>
          <p className="text-xs text-slate-500">{row.institute?.code}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => <span className="font-medium">{row.plan?.name || 'N/A'}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'start_date', header: 'Start', render: (row) => <span className="text-xs text-slate-500">{formatDate(row.start_date)}</span> },
    { key: 'expiry_date', header: 'Expiry', render: (row) => <span className="text-xs text-slate-500">{formatDate(row.expiry_date)}</span> },
  ];

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Subscriptions" description="Manage institute subscriptions" />

      <DataTable<SubRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        page={page}
        totalPages={data?.pagination.totalPages || 1}
        total={data?.pagination.total || 0}
        onPageChange={setPage}
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowAssign(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Assign Plan
            </Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenewTarget(row)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Renew
              </DropdownMenuItem>
              {row.status !== 'suspended' && (
                <DropdownMenuItem onClick={() => suspendMutation.mutate(row.id)}>
                  <Ban className="mr-2 h-4 w-4" /> Suspend
                </DropdownMenuItem>
              )}
              {row.status !== 'cancelled' && (
                <DropdownMenuItem className="text-red-600" onClick={() => cancelMutation.mutate(row.id)}>
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <AssignDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        onSubmit={(body) => assignMutation.mutate(body)}
        isSubmitting={assignMutation.isPending}
        institutes={institutesData?.data || []}
        plans={plansData?.data || []}
      />

      <RenewDialog
        open={!!renewTarget}
        onOpenChange={(open) => !open && setRenewTarget(null)}
        onSubmit={(body) => renewTarget && renewMutation.mutate({ id: renewTarget.id, body })}
        isSubmitting={renewMutation.isPending}
        target={renewTarget}
      />
    </DashboardLayout>
  );
}

function AssignDialog({ open, onOpenChange, onSubmit, isSubmitting, institutes, plans }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
  institutes: Array<{ id: string; name: string; code: string }>;
  plans: Array<{ id: string; name: string }>;
}) {
  const [instituteId, setInstituteId] = useState('');
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Assign Subscription" description="Assign a subscription plan to an institute" onSubmit={() => onSubmit({ instituteId, planId, startDate, expiryDate })} submitLabel="Assign" isSubmitting={isSubmitting}>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>Institute *</Label>
          <Select value={instituteId} onValueChange={setInstituteId}>
            <SelectTrigger><SelectValue placeholder="Select institute" /></SelectTrigger>
            <SelectContent>
              {institutes.map((i) => <SelectItem key={i.id} value={i.id}>{i.name} ({i.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Plan *</Label>
          <Select value={planId} onValueChange={setPlanId}>
            <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
            <SelectContent>
              {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Expiry Date</Label>
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </div>
        </div>
      </div>
    </FormDialog>
  );
}

function RenewDialog({ open, onOpenChange, onSubmit, isSubmitting, target }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
  target: SubRow | null;
}) {
  const [expiryDate, setExpiryDate] = useState(target?.expiry_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Renew Subscription" description={`Renew subscription for ${target?.institute?.name}`} onSubmit={() => onSubmit({ expiryDate })} submitLabel="Renew" isSubmitting={isSubmitting}>
      <div className="space-y-4 py-2">
        <div className="space-y-1.5">
          <Label>New Expiry Date</Label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
      </div>
    </FormDialog>
  );
}
