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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FeeCategoryRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
}

interface FeeCategoryForm {
  name: string;
  code: string;
  description: string;
}

const EMPTY_FORM: FeeCategoryForm = { name: '', code: '', description: '' };

export default function FeeCategoriesPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState<FeeCategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeCategoryRow | null>(null);
  const [createForm, setCreateForm] = useState<FeeCategoryForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<FeeCategoryForm>(EMPTY_FORM);

  const { data, isLoading } = useQuery<{ data: FeeCategoryRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['fee-categories', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<FeeCategoryRow[]>(`/api/v1/fees/categories?${params}`);
      return { data: res.data as FeeCategoryRow[], pagination: res.pagination! };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/fees/categories', body),
    onSuccess: () => {
      toast({ title: 'Fee category created successfully' });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => api.put(`/api/v1/fees/categories/${id}`, body),
    onSuccess: () => {
      toast({ title: 'Fee category updated successfully' });
      setShowEdit(false);
      setEditTarget(null);
      setEditForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/fees/categories/${id}`),
    onSuccess: () => {
      toast({ title: 'Fee category deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['fee-categories'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function openEdit(row: FeeCategoryRow) {
    setEditTarget(row);
    setEditForm({
      name: row.name,
      code: row.code,
      description: row.description ?? '',
    });
    setShowEdit(true);
  }

  const columns: Column<FeeCategoryRow>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (row) => <span className="text-sm text-slate-600">{row.description || '-'}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Fee Categories" description="Manage fee category types" />

      <DataTable<FeeCategoryRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name or code..."
        page={page}
        totalPages={data?.pagination.totalPages || 1}
        total={data?.pagination.total || 0}
        onPageChange={setPage}
        emptyMessage="No fee categories found"
        toolbar={
          <Button onClick={() => { setCreateForm(EMPTY_FORM); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Category
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

      {/* Create dialog */}
      <FormDialog
        open={showCreate}
        onOpenChange={(open) => { setShowCreate(open); if (!open) setCreateForm(EMPTY_FORM); }}
        title="Add Fee Category"
        description="Create a new fee category type"
        onSubmit={() => createMutation.mutate(createForm as unknown as Record<string, unknown>)}
        submitLabel="Create"
        isSubmitting={createMutation.isPending}
      >
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Name *</Label>
            <Input
              id="create-name"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="e.g. Tuition Fee"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-code">Code *</Label>
            <Input
              id="create-code"
              value={createForm.code}
              onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
              placeholder="e.g. TUITION"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="create-description">Description</Label>
            <Textarea
              id="create-description"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              placeholder="Optional description for this fee category"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>

      {/* Edit dialog */}
      <FormDialog
        open={showEdit}
        onOpenChange={(open) => { setShowEdit(open); if (!open) { setEditTarget(null); setEditForm(EMPTY_FORM); } }}
        title="Edit Fee Category"
        description="Update fee category details"
        onSubmit={() => editTarget && updateMutation.mutate({ id: editTarget.id, body: editForm as unknown as Record<string, unknown> })}
        submitLabel="Save"
        isSubmitting={updateMutation.isPending}
      >
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="e.g. Tuition Fee"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-code">Code *</Label>
            <Input
              id="edit-code"
              value={editForm.code}
              onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
              placeholder="e.g. TUITION"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Optional description for this fee category"
              rows={3}
            />
          </div>
        </div>
      </FormDialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Fee Category"
        description={`Delete ${deleteTarget?.name} (${deleteTarget?.code})? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}
