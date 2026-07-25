'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import {
  DataTable,
  type Column,
  FormDialog,
  ConfirmDialog,
  StatusBadge,
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Receipt, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/utils';

interface StudentFeeRow {
  id: string;
  total_amount: number;
  discount_amount: number;
  waived_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  category?: { id: string; name: string; code: string } | null;
}

export default function StudentFeesPage() {
  const api = useApi();
  const { toast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery<StudentFeeRow[]>({
    queryKey: ['student-fees'],
    queryFn: async () => {
      const res = await api.get<StudentFeeRow[]>('/api/v1/student/fees');
      if (!res.success) {
        throw new Error('Failed to load fee records');
      }
      return res.data as StudentFeeRow[];
    },
    meta: {
      onError: (err: Error) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      },
    },
  });

  const fees = data ?? [];

  // Aggregate stats from the fee records
  const totalFees = fees.reduce((sum: number, f: StudentFeeRow) => sum + (f.total_amount - f.discount_amount - f.waived_amount), 0);
  const totalPaid = fees.reduce((sum: number, f: StudentFeeRow) => sum + f.paid_amount, 0);
  const totalBalance = fees.reduce((sum: number, f: StudentFeeRow) => sum + f.balance_amount, 0);
  const overdueCount = fees.filter((f: StudentFeeRow) => f.status === 'overdue').length;

  const columns: Column<StudentFeeRow>[] = [
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <span className="font-medium text-slate-900">
          {row.category?.name ?? 'Uncategorized'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      render: (row) => <span>{formatCurrency(row.total_amount)}</span>,
    },
    {
      key: 'discount_amount',
      header: 'Discount',
      render: (row) => (
        <span className={row.discount_amount > 0 ? 'text-slate-700' : 'text-slate-400'}>
          {formatCurrency(row.discount_amount)}
        </span>
      ),
    },
    {
      key: 'paid_amount',
      header: 'Paid',
      render: (row) => (
        <span className="font-medium text-green-700">{formatCurrency(row.paid_amount)}</span>
      ),
    },
    {
      key: 'balance_amount',
      header: 'Balance',
      render: (row) => (
        <span className={row.balance_amount > 0 ? 'font-medium text-red-600' : 'text-slate-500'}>
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (row) => (
        <span className="text-slate-600">
          {row.due_date ? formatDate(row.due_date) : '—'}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="My Fees" description="View your fee records and payment status" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Fees"
          value={formatCurrency(totalFees)}
          icon={CreditCard}
          color="blue"
          description={`${fees.length} record${fees.length === 1 ? '' : 's'}`}
        />
        <StatCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="Total Balance"
          value={formatCurrency(totalBalance)}
          icon={Receipt}
          color={totalBalance > 0 ? 'red' : 'gray'}
        />
        <StatCard
          title="Overdue"
          value={overdueCount}
          icon={AlertCircle}
          color={overdueCount > 0 ? 'red' : 'gray'}
          description={overdueCount > 0 ? 'Action required' : 'All clear'}
        />
      </div>

      {/* Fees Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-6">
          {isError ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load fee records'}
              onRetry={() => refetch()}
            />
          ) : !isLoading && fees.length === 0 ? (
            <EmptyState
              title="No fee records found"
              description="You don't have any fee records assigned yet. Please check back later or contact the administration office."
            />
          ) : (
            <DataTable
              columns={columns}
              data={fees}
              isLoading={isLoading}
              searchPlaceholder="Search fees..."
              emptyMessage="No fee records found"
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
