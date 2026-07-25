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
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, UserCheck, UserX, FileSpreadsheet } from 'lucide-react';
import { ExcelImportModal } from '@/components/shared/excel-import-modal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import type { Subject } from '@/lib/types';

interface TeacherRow {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  qualification: string | null;
  specialization: string | null;
  joining_date: string;
  is_active: boolean;
  batches?: Array<{ id: string; name: string } | null>;
  subjects?: Array<{ id: string; name: string } | null>;
}

export default function TeachersPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRow | null>(null);

  const { data, isLoading } = useQuery<{ data: TeacherRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['teachers', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<TeacherRow[]>(`/api/v1/teachers?${params}`);
      return { data: res.data as TeacherRow[], pagination: res.pagination! };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/teachers', body),
    onSuccess: () => {
      toast({ title: 'Teacher created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/v1/teachers/${id}/status`, { isActive }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/teachers/${id}`),
    onSuccess: () => {
      toast({ title: 'Teacher deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<TeacherRow>[] = [
    {
      key: 'name',
      header: 'Teacher',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.first_name} {row.last_name}</p>
          <p className="text-xs text-slate-500">{row.employee_id}</p>
        </div>
      ),
    },
    { key: 'qualification', header: 'Qualification', render: (row) => <span className="text-slate-600">{row.qualification || '-'}</span> },
    { key: 'specialization', header: 'Specialization', render: (row) => <span className="text-slate-600">{row.specialization || '-'}</span> },
    { key: 'email', header: 'Contact', render: (row) => <div><p className="text-xs">{row.email || '-'}</p><p className="text-xs text-slate-400">{row.phone || ''}</p></div> },
    { key: 'batches', header: 'Batches', render: (row) => <span className="text-xs">{row.batches?.filter(Boolean).map(b => b!.name).join(', ') || '-'}</span> },
    { key: 'subjects', header: 'Subjects', render: (row) => <span className="text-xs">{row.subjects?.filter(Boolean).map(s => s!.name).join(', ') || '-'}</span> },
    { key: 'joining_date', header: 'Joined', render: (row) => <span className="text-xs text-slate-500">{formatDate(row.joining_date)}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  const [showImport, setShowImport] = useState(false);

  const teacherImportFields = [
    { key: 'firstName', label: 'First Name', required: true, example: 'Sarah' },
    { key: 'lastName', label: 'Last Name', example: 'Smith' },
    { key: 'employeeId', label: 'Employee ID', example: 'EMP101' },
    { key: 'email', label: 'Email', example: 'sarah.smith@example.com' },
    { key: 'phone', label: 'Phone', example: '9876543210' },
    { key: 'qualification', label: 'Qualification', example: 'M.Sc, B.Ed' },
    { key: 'specialization', label: 'Specialization', example: 'Mathematics' },
    { key: 'address', label: 'Address', example: '456 College Rd' },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Teachers" description="Manage teaching staff records" />

      <DataTable<TeacherRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, employee ID, email..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
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
            <Button variant="outline" onClick={() => setShowImport(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import Excel
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Teacher</Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/teachers/${row.id}`)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/teachers/${row.id}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
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

      <CreateTeacherDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} />

      <ExcelImportModal
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Teachers from Excel / CSV"
        description="Upload an Excel file to bulk import teacher records into your institute."
        endpoint="/api/v1/teachers/import"
        fields={teacherImportFields}
        entityName="Teachers"
        sampleFilename="teachers_import"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['teachers'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Teacher"
        description={`Delete ${deleteTarget?.first_name} ${deleteTarget?.last_name}? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

function CreateTeacherDialog({ open, onOpenChange, onSubmit, isSubmitting }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const api = useApi();
  const [form, setForm] = useState({
    employeeId: '', firstName: '', lastName: '', email: '', phone: '', qualification: '', specialization: '', joiningDate: new Date().toISOString().split('T')[0], address: '', username: '', password: '', notes: '',
  });
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['subjects-specialization-picker'],
    queryFn: async () => {
      const res = await api.get<any>('/api/v1/subjects?limit=200');
      return Array.isArray(res.data) ? res.data : (res.data?.data || []);
    },
    enabled: open,
  });

  const subjectsList = Array.isArray(subjects) ? subjects : [];

  const toggleSubject = (id: string) => {
    if (selectedSubjectIds.includes(id)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(s => s !== id));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, id]);
    }
  };

  const handleSubmit = () => {
    onSubmit({
      ...form,
      subjectIds: selectedSubjectIds,
    });
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Teacher" description="Create a new teacher record and assign subjects" onSubmit={handleSubmit} submitLabel="Create Teacher" isSubmitting={isSubmitting} size="lg">
      <div className="grid grid-cols-2 gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
        <div className="space-y-1.5"><Label>Employee ID *</Label><Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="EMP001" /></div>
        <div className="space-y-1.5"><Label>Joining Date *</Label><Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="M.Sc, B.Ed" /></div>
        <div className="space-y-1.5"><Label>Specialization</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Mathematics / Science" /></div>

        {/* Multi-subject picker */}
        {subjectsList.length > 0 && (
          <div className="col-span-2 space-y-2 border-t border-slate-100 pt-3">
            <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Assign Subjects (Select Multiple)</span>
              <span className="text-[11px] font-normal text-slate-500">{selectedSubjectIds.length} selected</span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {subjectsList.map((s: any) => {
                const checked = selectedSubjectIds.includes(s.id);
                return (
                  <label key={s.id} className={`flex items-center gap-2 p-2 rounded text-xs cursor-pointer transition-colors ${checked ? 'bg-purple-100 text-purple-900 font-medium' : 'hover:bg-white text-slate-700'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSubject(s.id)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="truncate">{s.name} ({s.code})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="col-span-2 space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        <div className="col-span-2 border-t pt-4 mt-2">
          <p className="text-sm font-medium text-slate-700 mb-3">Login Credentials (optional)</p>
        </div>
        <div className="space-y-1.5"><Label>Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="teacher01" /></div>
        <div className="space-y-1.5"><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></div>
        <div className="col-span-2 space-y-1.5"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
    </FormDialog>
  );
}
