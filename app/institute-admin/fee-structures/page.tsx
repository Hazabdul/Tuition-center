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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';

interface FeeStructureRow {
  id: string;
  category_id: string;
  batch_id: string | null;
  academic_year: string | null;
  amount: number;
  due_date: string | null;
  is_active: boolean;
  category?: { id: string; name: string; code: string } | null;
  batch?: { id: string; name: string; code: string } | null;
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

interface FeeFormState {
  category_id: string;
  batch_id: string;
  academic_year: string;
  amount: string;
  due_date: string;
}

const EMPTY_FORM: FeeFormState = {
  category_id: '',
  batch_id: '',
  academic_year: '',
  amount: '',
  due_date: '',
};

export default function FeeStructuresPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeStructureRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructureRow | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{ data: FeeStructureRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['fee-structures', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<FeeStructureRow[]>(`/api/v1/fees/structures?${params}`);
      return { data: res.data as FeeStructureRow[], pagination: res.pagination! };
    },
  });

  const { data: categoriesData } = useQuery<{ data: CategoryOption[] }>({
    queryKey: ['fee-categories-list'],
    queryFn: async () => {
      const res = await api.get<CategoryOption[]>('/api/v1/fees/categories?limit=100');
      return { data: res.data as CategoryOption[] };
    },
  });

  const { data: batchesData } = useQuery<{ data: BatchOption[] }>({
    queryKey: ['batches-list'],
    queryFn: async () => {
      const res = await api.get<BatchOption[]>('/api/v1/batches?limit=100');
      return { data: res.data as BatchOption[] };
    },
  });

  const structures = data?.data || [];
  const categories = categoriesData?.data || [];
  const batches = batchesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/fees/structures', body),
    onSuccess: () => {
      toast({ title: 'Fee structure created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/v1/fees/structures/${id}`, body),
    onSuccess: () => {
      toast({ title: 'Fee structure updated successfully' });
      setShowEdit(false);
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/fees/structures/${id}`),
    onSuccess: () => {
      toast({ title: 'Fee structure deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function openEdit(row: FeeStructureRow) {
    setEditTarget(row);
    setShowEdit(true);
  }

  const columns: Column<FeeStructureRow>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.category?.name || '-'}</p>
          <p className="text-xs text-slate-500">{row.category?.code || ''}</p>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-700">{row.batch?.name || 'All Batches'}</p>
          {row.batch?.code && <p className="text-xs text-slate-500">{row.batch.code}</p>}
        </div>
      ),
    },
    { key: 'academic_year', header: 'Academic Year', render: (row) => <span className="text-slate-600">{row.academic_year || '-'}</span> },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.amount)}</span>,
    },
    { key: 'due_date', header: 'Due Date', render: (row) => <span className="text-xs text-slate-500">{row.due_date ? formatDate(row.due_date) : '-'}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  const activeCount = structures.filter((s: FeeStructureRow) => s.is_active).length;
  const inactiveCount = structures.length - activeCount;
  const totalAmount = structures.reduce((sum: number, s: FeeStructureRow) => sum + (s.amount || 0), 0);

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Fee Structures" description="Manage fee structures for batches" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Structures" value={data?.pagination.total ?? structures.length} icon={Wallet} description="All fee structures" color="blue" />
        <StatCard title="Active" value={activeCount} icon={CheckCircle2} description="Currently active" color="green" />
        <StatCard title="Inactive" value={inactiveCount} icon={XCircle} description="Deactivated structures" color="gray" />
        <StatCard title="Total Amount" value={formatCurrency(totalAmount)} icon={Wallet} description="Sum of all structures" color="purple" />
      </div>

      {isError ? (
        <ErrorState message="Failed to load fee structures" onRetry={() => refetch()} />
      ) : (
        <DataTable<FeeStructureRow>
          columns={columns}
          data={structures}
          isLoading={isLoading}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by category, batch, year..."
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || 0}
          onPageChange={setPage}
          emptyMessage="No fee structures found"
          toolbar={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Structure
            </Button>
          }
          rowActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openEdit(row)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {!isLoading && structures.length === 0 && !isError && !search && (
        <div className="mt-4">
          <EmptyState
            title="No fee structures yet"
            description="Create your first fee structure to start collecting fees from batches."
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Structure
              </Button>
            }
          />
        </div>
      )}

      <FeeStructureFormDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        title="Add Fee Structure"
        description="Create a new fee structure for a batch"
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
        categories={categories}
        batches={batches}
        onSubmit={(form) => {
          const body: Record<string, unknown> = {
            category_id: form.category_id,
            batch_id: form.batch_id || null,
            academic_year: form.academic_year || null,
            amount: Number(form.amount),
            due_date: form.due_date || null,
          };
          createMutation.mutate(body);
        }}
      />

      <FeeStructureFormDialog
        open={showEdit}
        onOpenChange={(open) => { setShowEdit(open); if (!open) setEditTarget(null); }}
        title="Edit Fee Structure"
        description="Update fee structure details"
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
        categories={categories}
        batches={batches}
        initialValues={editTarget ? {
          category_id: editTarget.category_id,
          batch_id: editTarget.batch_id || '',
          academic_year: editTarget.academic_year || '',
          amount: String(editTarget.amount),
          due_date: editTarget.due_date || '',
        } : EMPTY_FORM}
        onSubmit={(form) => {
          if (!editTarget) return;
          const body: Record<string, unknown> = {
            category_id: form.category_id,
            batch_id: form.batch_id || null,
            academic_year: form.academic_year || null,
            amount: Number(form.amount),
            due_date: form.due_date || null,
          };
          updateMutation.mutate({ id: editTarget.id, body });
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Fee Structure"
        description={`Delete ${deleteTarget?.category?.name || 'this fee structure'}${deleteTarget?.batch?.name ? ` for ${deleteTarget.batch.name}` : ''}? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

function FeeStructureFormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  isSubmitting,
  categories,
  batches,
  initialValues,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  submitLabel: string;
  isSubmitting: boolean;
  categories: CategoryOption[];
  batches: BatchOption[];
  initialValues?: FeeFormState;
  onSubmit: (form: FeeFormState) => void;
}) {
  const [form, setForm] = useState<FeeFormState>(initialValues ?? EMPTY_FORM);

  // Sync form when dialog opens with new initial values (edit target changes)
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open && initialValues) {
      setForm(initialValues);
    } else if (open) {
      setForm(EMPTY_FORM);
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      onSubmit={() => onSubmit(form)}
      submitLabel={submitLabel}
      isSubmitting={isSubmitting}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5">
          <Label>Category *</Label>
          <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Batch</Label>
          <Select value={form.batch_id} onValueChange={(v) => setForm({ ...form, batch_id: v })}>
            <SelectTrigger><SelectValue placeholder="All batches" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Academic Year</Label>
          <Input
            value={form.academic_year}
            onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
            placeholder="2025-2026"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Amount *</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
      </div>
    </FormDialog>
  );
}
