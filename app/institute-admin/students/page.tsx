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

interface StudentRow {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  admission_date: string;
  academic_year: string | null;
  is_active: boolean;
  batches?: Array<{ id: string; name: string; code: string } | null>;
}

export default function StudentsPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StudentRow | null>(null);

  const { data, isLoading } = useQuery<{ data: StudentRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['students', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<StudentRow[]>(`/api/v1/students?${params}`);
      return { data: res.data as StudentRow[], pagination: res.pagination! };
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
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/students', body),
    onSuccess: () => {
      toast({ title: 'Student created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/v1/students/${id}/status`, { isActive }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/students/${id}`),
    onSuccess: () => {
      toast({ title: 'Student deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<StudentRow>[] = [
    {
      key: 'name',
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-slate-500">{row.student_id} · {row.admission_number}</p>
        </div>
      ),
    },
    { key: 'gender', header: 'Gender', render: (row) => <span className="text-slate-600 capitalize">{row.gender || '-'}</span> },
    { key: 'email', header: 'Contact', render: (row) => <div><p className="text-xs">{row.email || '-'}</p><p className="text-xs text-slate-400">{row.phone || ''}</p></div> },
    { key: 'batches', header: 'Batches', render: (row) => <span className="text-xs">{row.batches?.filter(Boolean).map(b => b!.name).join(', ') || '-'}</span> },
    { key: 'admission_date', header: 'Admitted', render: (row) => <span className="text-xs text-slate-500">{formatDate(row.admission_date)}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Students" description="Manage student records" />

      <DataTable<StudentRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, ID, email..."
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
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/students/${row.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/students/${row.id}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
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

      <CreateStudentDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} batches={batchesData?.data || []} />

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)} title="Delete Student" description={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} confirmLabel="Delete" variant="destructive" isSubmitting={deleteMutation.isPending} />
    </DashboardLayout>
  );
}

function CreateStudentDialog({ open, onOpenChange, onSubmit, isSubmitting, batches }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
  batches: Array<{ id: string; name: string; code: string }>;
}) {
  const [form, setForm] = useState({
    studentId: '', admissionNumber: '', firstName: '', lastName: '', dateOfBirth: '', gender: '', email: '', phone: '', altPhone: '', address: '', admissionDate: new Date().toISOString().split('T')[0], academicYear: '', batchId: '', emergencyContactName: '', emergencyContactPhone: '', notes: '', username: '', password: '',
  });

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Student" description="Create a new student record" onSubmit={() => onSubmit(form)} submitLabel="Create" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5"><Label>Student ID *</Label><Input value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} placeholder="STU001" /></div>
        <div className="space-y-1.5"><Label>Admission Number *</Label><Input value={form.admissionNumber} onChange={(e) => setForm({ ...form, admissionNumber: e.target.value })} placeholder="ADM001" /></div>
        <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Gender</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Alt Phone</Label><Input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Admission Date</Label><Input type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Academic Year</Label><Input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" /></div>
        <div className="space-y-1.5"><Label>Batch</Label><Select value={form.batchId} onValueChange={(v) => setForm({ ...form, batchId: v })}><SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger><SelectContent>{batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>)}</SelectContent></Select></div>
        <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Emergency Contact Name</Label><Input value={form.emergencyContactName} onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Emergency Contact Phone</Label><Input value={form.emergencyContactPhone} onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })} /></div>
        <div className="col-span-2 border-t pt-4 mt-2">
          <p className="text-sm font-medium text-slate-700 mb-3">Login Credentials (optional)</p>
        </div>
        <div className="space-y-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="student01" /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
        <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </FormDialog>
  );
}
