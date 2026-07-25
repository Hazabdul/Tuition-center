'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { DataTable, type Column, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AttendanceRow {
  id: string;
  date: string;
  status: string;
  remarks: string | null;
  batch?: { name: string } | null;
}

interface Child {
  id: string;
  first_name: string;
  last_name: string | null;
  student_id: string;
}

const columns: Column<AttendanceRow>[] = [
  { key: 'date', header: 'Date', sortable: true, render: (r) => <span>{formatDate(r.date)}</span> },
  { key: 'batch', header: 'Batch', render: (r) => <span>{r.batch?.name || '—'}</span> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  { key: 'remarks', header: 'Remarks', render: (r) => <span className="text-slate-500 text-xs">{r.remarks || '—'}</span> },
];

export default function ParentChildAttendancePage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => {
      const res = await api.get<{ children: Child[] }>('/api/v1/dashboard');
      return res.data;
    },
  });
  const children = childrenData?.children || [];

  const { data, isLoading } = useQuery({
    queryKey: ['parent-child-attendance', selectedChild, page],
    enabled: !!selectedChild,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', studentId: selectedChild });
      const res = await api.get<AttendanceRow[]>(`/api/v1/attendance?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Child Attendance" description="View attendance records for your children" />

      <div className="mb-6">
        <Select value={selectedChild} onValueChange={(v) => { setSelectedChild(v); setPage(1); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name || ''} ({c.student_id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedChild ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a child to view attendance</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={data?.data || []}
          isLoading={isLoading}
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || 0}
          onPageChange={setPage}
          emptyMessage="No attendance records found"
        />
      )}
    </DashboardLayout>
  );
}
