'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { DataTable, type Column, PageHeader, StatusBadge } from '@/components/shared';
import { format } from 'date-fns';

interface StudentRow {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  batch?: { name: string } | null;
}

const columns: Column<StudentRow>[] = [
  { key: 'student_id', header: 'ID', sortable: true, render: (row) => <span className="font-mono text-xs font-semibold">{row.student_id || (row as any).studentId || '—'}</span> },
  {
    key: 'first_name',
    header: 'Name',
    render: (row) => {
      const fn = row.first_name || (row as any).firstName || '';
      const ln = row.last_name || (row as any).lastName || '';
      return <span className="font-medium text-slate-900">{`${fn} ${ln}`.trim() || 'Student'}</span>;
    },
  },
  { key: 'email', header: 'Email', render: (row) => <span>{row.email || '—'}</span> },
  { key: 'phone', header: 'Phone', render: (row) => <span>{row.phone || '—'}</span> },
  {
    key: 'batch',
    header: 'Batch',
    render: (row) => <span>{row.batch?.name || '—'}</span>,
  },
  {
    key: 'is_active',
    header: 'Status',
    render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} />,
  },
];

export default function TeacherStudentsPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-students', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<StudentRow[]>(`/api/v1/students?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="My Students" description="Students in your assigned batches" />

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search students..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        emptyMessage="No students found in your assigned batches"
      />
    </DashboardLayout>
  );
}
