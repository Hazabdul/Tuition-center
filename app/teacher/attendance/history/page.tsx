'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { DataTable, type Column, PageHeader, StatusBadge } from '@/components/shared';
import { formatDate } from '@/lib/utils';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  student?: { first_name: string; last_name: string | null; student_id: string } | null;
  batch?: { name: string } | null;
}

const columns: Column<AttendanceRow>[] = [
  {
    key: 'date',
    header: 'Date',
    sortable: true,
    render: (row) => <span>{formatDate(row.date)}</span>,
  },
  {
    key: 'student',
    header: 'Student',
    render: (row) => (
      <div>
        <span className="font-medium">{row.student?.first_name} {row.student?.last_name || ''}</span>
        <span className="text-xs text-slate-400 ml-1">({row.student?.student_id})</span>
      </div>
    ),
  },
  { key: 'batch', header: 'Batch', render: (row) => <span>{row.batch?.name || '—'}</span> },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
  { key: 'remarks', header: 'Remarks', render: (row) => <span className="text-slate-500">{row.remarks || '—'}</span> },
];

export default function TeacherAttendanceHistoryPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-attendance-history', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<AttendanceRow[]>(`/api/v1/attendance?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="Attendance History" description="Review attendance records you've submitted" />
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by student name..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        emptyMessage="No attendance records found"
      />
    </DashboardLayout>
  );
}
