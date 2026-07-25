'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { DataTable, type Column, PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Receipt } from 'lucide-react';

interface PaymentRow {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  is_reversed: boolean;
  student_fee?: { category?: { name: string } | null } | null;
}

const columns: Column<PaymentRow>[] = [
  { key: 'receipt_number', header: 'Receipt No.', sortable: true, render: (row) => <span className="font-mono text-sm font-medium">{row.receipt_number}</span> },
  { key: 'payment_date', header: 'Date', render: (row) => <span>{formatDate(row.payment_date)}</span> },
  { key: 'fee_type', header: 'Fee Type', render: (row) => <span>{row.student_fee?.category?.name || '—'}</span> },
  { key: 'amount_paid', header: 'Amount', render: (row) => <span className="font-semibold text-green-700">{formatCurrency(row.amount_paid)}</span> },
  { key: 'payment_method', header: 'Method', render: (row) => <Badge variant="outline" className="capitalize">{row.payment_method.replace('_', ' ')}</Badge> },
  { key: 'reference_number', header: 'Reference', render: (row) => <span className="text-xs text-slate-500">{row.reference_number || '—'}</span> },
  {
    key: 'is_reversed',
    header: 'Status',
    render: (row) => (
      <Badge className={row.is_reversed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
        {row.is_reversed ? 'Reversed' : 'Completed'}
      </Badge>
    ),
  },
];

export default function StudentFeePaymentsPage() {
  const api = useApi();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['student-fee-payments', page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await api.get<PaymentRow[]>(`/api/v1/payments/student/me?${params}`);
      return res;
    },
  });

  // Totals
  const payments = data?.data || [];
  const totalPaid = payments.filter((p: any) => !p.is_reversed).reduce((sum: number, p: any) => sum + Number(p.amount_paid), 0);

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="Payment History" description="All your fee payment records" />

      {totalPaid > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
          <Receipt className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-700">Total paid: {formatCurrency(totalPaid)}</span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={payments}
        isLoading={isLoading}
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        emptyMessage="No payment records found"
      />
    </DashboardLayout>
  );
}
