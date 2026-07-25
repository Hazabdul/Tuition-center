'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { DataTable, type Column, PageHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Child { id: string; first_name: string; last_name: string | null; student_id: string; }
interface PaymentRow {
  id: string;
  receipt_number: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  is_reversed: boolean;
  student_fee?: { category?: { name: string } | null } | null;
}

const columns: Column<PaymentRow>[] = [
  { key: 'receipt_number', header: 'Receipt No.', render: (r) => <span className="font-mono text-xs font-medium">{r.receipt_number}</span> },
  { key: 'payment_date', header: 'Date', render: (r) => <span>{formatDate(r.payment_date)}</span> },
  { key: 'fee_type', header: 'Type', render: (r) => <span>{r.student_fee?.category?.name || '—'}</span> },
  { key: 'amount_paid', header: 'Amount', render: (r) => <span className="font-semibold text-green-700">{formatCurrency(r.amount_paid)}</span> },
  { key: 'payment_method', header: 'Method', render: (r) => <Badge variant="outline" className="capitalize">{r.payment_method.replace('_', ' ')}</Badge> },
  { key: 'is_reversed', header: 'Status', render: (r) => (
    <Badge className={r.is_reversed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
      {r.is_reversed ? 'Reversed' : 'Completed'}
    </Badge>
  )},
];

export default function ParentChildPaymentsPage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => { const res = await api.get<{ children: Child[] }>('/api/v1/dashboard'); return res.data; },
  });
  const children = childrenData?.children || [];

  const { data, isLoading } = useQuery({
    queryKey: ['parent-child-payments', selectedChild, page],
    enabled: !!selectedChild,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', studentId: selectedChild });
      const res = await api.get<PaymentRow[]>(`/api/v1/payments?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Payment History" description="View payment records for your children" />

      <div className="mb-6">
        <Select value={selectedChild} onValueChange={(v) => { setSelectedChild(v); setPage(1); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a child" />
          </SelectTrigger>
          <SelectContent>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} ({c.student_id})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedChild ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <Receipt className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a child to view payment history</p>
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
          emptyMessage="No payment records found"
        />
      )}
    </DashboardLayout>
  );
}
