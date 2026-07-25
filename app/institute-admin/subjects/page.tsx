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
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, Pencil, Trash2, UserCheck, UserX, BookOpen, GraduationCap, Users, FileSpreadsheet } from 'lucide-react';
import { ExcelImportModal } from '@/components/shared/excel-import-modal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { Batch, Teacher, Student } from '@/lib/types';

interface SubjectRow {
  id: string;
  name: string;
  code: string;
  description: string | null;
  max_marks: number;
  passing_marks: number;
  is_active: boolean;
}

export default function SubjectsPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubjectRow | null>(null);

  const { data, isLoading } = useQuery<{ data: SubjectRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['subjects', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<SubjectRow[]>(`/api/v1/subjects?${params}`);
      return { data: res.data as SubjectRow[], pagination: res.pagination! };
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/subjects', body),
    onSuccess: () => {
      toast({ title: 'Subject created successfully' });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/api/v1/subjects/${id}/status`, { isActive }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/subjects/${id}`),
    onSuccess: () => {
      toast({ title: 'Subject deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const columns: Column<SubjectRow>[] = [
    {
      key: 'name',
      header: 'Subject',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">{row.code}</p>
        </div>
      ),
    },
    { key: 'description', header: 'Description', render: (row) => <span className="text-sm text-slate-600 line-clamp-1">{row.description || '-'}</span> },
    { key: 'max_marks', header: 'Max Marks', render: (row) => <span className="text-slate-600">{row.max_marks}</span> },
    { key: 'passing_marks', header: 'Passing Marks', render: (row) => <span className="text-slate-600">{row.passing_marks}</span> },
    { key: 'is_active', header: 'Status', render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
  ];

  const [showImport, setShowImport] = useState(false);

  const subjectImportFields = [
    { key: 'name', label: 'Subject Name', required: true, example: 'Mathematics' },
    { key: 'code', label: 'Subject Code', example: 'MATH' },
    { key: 'maxMarks', label: 'Max Marks', example: '100' },
    { key: 'passingMarks', label: 'Passing Marks', example: '40' },
    { key: 'description', label: 'Description', example: 'Core mathematics course' },
    { key: 'syllabus', label: 'Syllabus', example: 'Algebra, Geometry, Trigonometry' },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Subjects" description="Manage academic subjects and link them to batches, teachers, and students" />

      <DataTable<SubjectRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, code..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        toolbar={
          <>
            <Button variant="outline" onClick={() => setShowImport(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import Excel
            </Button>
            <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Subject</Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/subjects/${row.id}/edit`)}><Eye className="mr-2 h-4 w-4" /> View / Edit / Links</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/institute-admin/subjects/${row.id}/edit`)}><Pencil className="mr-2 h-4 w-4" /> Edit Details</DropdownMenuItem>
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

      <CreateSubjectDialog open={showCreate} onOpenChange={setShowCreate} onSubmit={(body) => createMutation.mutate(body)} isSubmitting={createMutation.isPending} />

      <ExcelImportModal
        open={showImport}
        onOpenChange={setShowImport}
        title="Import Subjects from Excel / CSV"
        description="Upload an Excel file to bulk import academic subjects into your institute."
        endpoint="/api/v1/subjects/import"
        fields={subjectImportFields}
        entityName="Subjects"
        sampleFilename="subjects_import"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['subjects'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Subject"
        description={`Delete ${deleteTarget?.name} (${deleteTarget?.code})? This cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

function CreateSubjectDialog({ open, onOpenChange, onSubmit, isSubmitting }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (body: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState({
    name: '', code: '', description: '', syllabus: '', maxMarks: '100', passingMarks: '40',
  });

  const handleNameChange = (nameVal: string) => {
    const autoCode = nameVal.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
    setForm((prev) => ({
      ...prev,
      name: nameVal,
      code: prev.code ? prev.code : autoCode,
    }));
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add Subject" description="Create a new academic subject for your institute" onSubmit={handleSubmit} submitLabel="Create Subject" isSubmitting={isSubmitting}>
      <div className="grid grid-cols-1 gap-4 py-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Subject Name *</Label>
            <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Mathematics" required />
          </div>
          <div className="space-y-1.5">
            <Label>Subject Code</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. MATH (Auto-generated if empty)" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Max Marks</Label><Input type="number" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Passing Marks</Label><Input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Optional course description..." /></div>
        <div className="space-y-1.5"><Label>Syllabus / Course Content</Label><Textarea value={form.syllabus} onChange={(e) => setForm({ ...form, syllabus: e.target.value })} rows={3} placeholder="Enter topics, modules, chapters, or syllabus details..." /></div>
      </div>
    </FormDialog>
  );
}
