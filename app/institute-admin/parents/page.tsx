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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';

interface ParentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  occupation: string | null;
  is_active: boolean;
  created_at: string;
  children?: Array<{ id: string; first_name: string; last_name: string | null; student_id: string } | null>;
}

export default function ParentsPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ParentRow | null>(null);

  const { data, isLoading } = useQuery<{ data: ParentRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['parents', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<ParentRow[]>(`/api/v1/parents?${params}`);
      return { data: res.data as ParentRow[], pagination: res.pagination! };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/parents', body),
    onSuccess: () => {
      toast({ title: 'Parent created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/v1/parents/${id}/status`, { isActive }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/parents/${id}`),
    onSuccess: () => {
      toast({ title: 'Parent deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<ParentRow>[] = [
    {
      key: 'name',
      header: 'Parent',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-slate-500">{row.relationship || 'Guardian'}</p>
        </div>
      ),
    },
    { key: 'email', header: 'Contact', render: (row) => <div><p className="text-xs">{row.email || '-'}</p><p className="text-xs text-slate-400">{row.phone || ''}</p></div> },
    { key: 'occupation', header: 'Occupation', render: (row) => <span className="text-slate-600">{row.occupation || '-'}</span> },
    { key: 'children', header: 'Children', render: (row) => <span className="text-xs">{row.children?.filter(Boolean).map(c => `${c!.first_name} ${c!.last_name || ''}`).join(', ') || '-'}</span> },
    { key: 'created_at', header: 'Added', render: (row) => <span className="text-xs text-slate-500">{formatDate(row.created_at)}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Parents" description="Manage parent and guardian records" />

      <DataTable<ParentRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, email, phone..."
        page={page}
        totalPages={data?.pagination.totalPages || 1}
        total={data?.pagination.total || 0}
        onPageChange={setPage}
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="Filter status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Parent</Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/parents/${row.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/parents/${row.id}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
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

      <CreateParentDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Parent"
        description={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

function CreateParentDialog({ open, onOpenChange, onSubmit, isSubmitting }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', altPhone: '', address: '', relationship: '', occupation: '', username: '', password: '', notes: '',
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Parent" description="Create a new parent or guardian record" onSubmit={() => onSubmit(form)} submitLabel="Create" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Alt Phone</Label><Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>Relationship</Label>
          <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="father">Father</SelectItem>
              <SelectItem value="mother">Mother</SelectItem>
              <SelectItem value="guardian">Guardian</SelectItem>
              <SelectItem value="grandparent">Grandparent</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Occupation</Label><Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
        <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="col-span-2 border-t pt-4 mt-2">
          <p className="text-sm font-medium text-slate-700 mb-3">Login Credentials (optional)</p>
        </div>
        <div className="space-y-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="parent01" /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
        <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </FormDialog>
  );
}
