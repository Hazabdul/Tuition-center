'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, FormDialog, ConfirmDialog, StatusBadge, PageHeader, StatCard, EmptyState, ErrorState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, Send, EyeOff, PenSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface ExamRow {
  id: string;
  name: string;
  code: string;
  batch_id: string;
  academic_year: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'published';
  batch?: { id: string; name: string; code: string } | null;
}

export default function ExamsPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExamRow | null>(null);

  const { data, isLoading, isError } = useQuery<{ data: ExamRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['exams', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<ExamRow[]>(`/api/v1/exams?${params}`);
      return { data: res.data as ExamRow[], pagination: res.pagination! };
    },
  });

  const { data: batchesData } = useQuery<{ data: Array<{ id: string; name: string; code: string }> }>({
    queryKey: ['batches-list'],
    queryFn: async () => {
      const res = await api.get<Array<{ id: string; name: string; code: string }>>('/api/v1/batches?limit=100');
      return { data: res.data as Array<{ id: string; name: string; code: string }> };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/exams', body),
    onSuccess: () => {
      toast({ title: 'Exam created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'published' | 'draft' }) =>
      api.patch(`/api/v1/exams/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Exam status updated' });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/exams/${id}`),
    onSuccess: () => {
      toast({ title: 'Exam deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<ExamRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    { key: 'code', header: 'Code', render: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span> },
    { key: 'batch', header: 'Batch', render: (row) => <span className="text-slate-600">{row.batch?.name || '-'}</span> },
    {
      key: 'dates',
      header: 'Dates',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.start_date || row.end_date ? `${row.start_date ? formatDate(row.start_date) : '-'} - ${row.end_date ? formatDate(row.end_date) : '-'}` : '-'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
  ];

  if (isError) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <PageHeader title="Exams" description="Manage examinations and marks" />
        <ErrorState message="Failed to load exams. Please try again." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Exams" description="Manage examinations and marks" />

      <DataTable<ExamRow>
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
        toolbar={
          <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Exam</Button>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/exams/${row.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/exams/${row.id}/marks`)}><PenSquare className="mr-2 h-4 w-4" /> Edit Marks</DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === 'published' ? (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, status: 'draft' })}><EyeOff className="mr-2 h-4 w-4" /> Unpublish</DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, status: 'published' })}><Send className="mr-2 h-4 w-4" /> Publish</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {!isLoading && (data?.data || []).length === 0 && !search && (
        <EmptyState title="No exams yet" description="Create your first exam to start managing marks." action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Exam</Button>} />
      )}

      <CreateExamDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} batches={batchesData?.data || []} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Delete Exam" description={`Delete ${deleteTarget?.name}? This cannot be undone.`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} confirmLabel="Delete" variant="destructive" isSubmitting={deleteMutation.isPending} />
    </DashboardLayout>
  );
}

function CreateExamDialog({ open, onOpenChange, onSubmit, isSubmitting, batches }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
  batches: Array<{ id: string; name: string; code: string }>;
}) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    batch_id: '',
    academic_year: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Exam" description="Create a new examination" onSubmit={() => onSubmit(form)} submitLabel="Create" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Mid-term Examination" /></div>
        <div className="space-y-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MID2026" /></div>
        <div className="space-y-1.5">
          <Label>Batch *</Label>
          <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
            <SelectContent>
              {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Academic Year</Label><Input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="2025-2026" /></div>
        <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Exam description..." /></div>
      </div>
    </FormDialog>
  );
}
