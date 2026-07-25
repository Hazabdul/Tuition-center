'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, FormDialog, ConfirmDialog, StatusBadge, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface BatchRow {
  id: string;
  name: string;
  code: string;
  academic_year: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  description: string | null;
  is_active: boolean;
  _count?: { students: number; teachers: number; subjects: number };
}

export default function BatchesPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BatchRow | null>(null);

  const { data, isLoading } = useQuery<{ data: BatchRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['batches', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<BatchRow[]>(`/api/v1/batches?${params}`);
      return { data: res.data as BatchRow[], pagination: res.pagination! };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/batches', body),
    onSuccess: () => {
      toast({ title: 'Batch created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/v1/batches/${id}/status`, { isActive }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/batches/${id}`),
    onSuccess: () => {
      toast({ title: 'Batch deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<BatchRow>[] = [
    {
      key: 'name',
      header: 'Batch',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.code}</p>
        </div>
      ),
    },
    { key: 'academic_year', header: 'Academic Year', render: (row) => <span className="text-slate-600">{row.academic_year || '-'}</span> },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (row) => (
        <div>
          <p className="text-xs text-slate-600">{row.start_date ? formatDate(row.start_date) : '-'} → {row.end_date ? formatDate(row.end_date) : '-'}</p>
          <p className="text-xs text-slate-400">{row.start_time || '-'} - {row.end_time || '-'}</p>
        </div>
      ),
    },
    { key: 'capacity', header: 'Capacity', render: (row) => <span className="text-slate-600">{row.capacity}</span> },
    {
      key: 'counts',
      header: 'Members',
      render: (row) => (
        <div className="text-xs text-slate-500">
          <p>{row._count?.students || 0} students</p>
          <p>{row._count?.teachers || 0} teachers</p>
        </div>
      ),
    },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Batches" description="Manage class batches and schedules" />

      <DataTable<BatchRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, code..."
        page={page}
        totalPages={data?.pagination.totalPages || 1}
        total={data?.pagination.total || 0}
        onPageChange={setPage}
        toolbar={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Batch</Button>}
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/batches/${row.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/batches/${row.id}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.is_active ? (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, isActive: false })}><UserX className="mr-2 h-4 w-4" /> Deactivate</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, isActive: true })}><UserCheck className="mr-2 h-4 w-4" /> Activate</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <CreateBatchDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Batch"
        description={`Delete ${deleteTarget?.name} (${deleteTarget?.code})? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

function CreateBatchDialog({ open, onOpenChange, onSubmit, isSubmitting }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    name: '', code: '', academicYear: '', startDate: '', endDate: '', startTime: '', endTime: '', capacity: '30', description: '',
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Batch" description="Create a new class batch" onSubmit={() => onSubmit(form)} submitLabel="Create" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Grade 10 - Section A" /></div>
        <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="G10A" /></div>
        <div className="space-y-1.5"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" /></div>
        <div className="space-y-1.5"><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Start Time</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>End Time</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
      </div>
    </FormDialog>
  );
}
