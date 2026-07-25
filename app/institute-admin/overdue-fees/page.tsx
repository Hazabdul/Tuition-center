'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface FeeRow {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: string;
  student?: { first_name: string; last_name: string | null; student_id: string } | null;
  category?: { name: string } | null;
}

const columns: Column<FeeRow>[] = [
  {
    key: 'student',
    header: 'Student',
    render: (r) => (
      <div>
        <p className="font-medium text-slate-800">{r.student?.first_name} {r.student?.last_name || ''}</p>
        <p className="text-xs text-slate-400">{r.student?.student_id}</p>
      </div>
    ),
  },
  { key: 'category', header: 'Fee Type', render: (r) => <span>{r.category?.name || '—'}</span> },
  { key: 'total_amount', header: 'Total', render: (r) => <span>{formatCurrency(r.total_amount)}</span> },
  { key: 'paid_amount', header: 'Paid', render: (r) => <span className="text-green-700">{formatCurrency(r.paid_amount)}</span> },
  { key: 'balance_amount', header: 'Balance', render: (r) => <span className="font-semibold text-red-700">{formatCurrency(r.balance_amount)}</span> },
  { key: 'due_date', header: 'Due Date', render: (r) => <span className="text-red-600 text-sm">{r.due_date ? formatDate(r.due_date) : '—'}</span> },
  { key: 'status', header: 'Status', render: () => <Badge className="bg-red-100 text-red-700">Overdue</Badge> },
];

export default function InstituteAdminOverdueFeesPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['overdue-fees', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search, status: 'overdue' });
      const res = await api.get<FeeRow[]>(`/api/v1/student-fees?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Overdue Fees" description="Students with overdue fee balances requiring immediate attention">
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {data?.pagination?.total || 0} overdue records
        </div>
      </PageHeader>

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
        emptyMessage="No overdue fees 🎉"
      />
    </DashboardLayout>
  );
}
