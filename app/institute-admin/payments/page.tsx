'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, FormDialog, StatusBadge, PageHeader, StatCard, EmptyState, ErrorState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Eye, CreditCard, Receipt } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';

interface PaymentRow {
  id: string;
  receipt_number: string;
  student_id: string;
  student_fee_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  is_reversed: boolean;
  notes: string | null;
  student?: { id: string; first_name: string; last_name: string | null; student_id: string } | null;
  student_fee?: { id: string; balance_amount: number; category?: { name: string } | null } | null;
}

interface PendingStudentFee {
  id: string;
  student_id: string;
  balance_amount: number;
  student: { first_name: string; last_name: string | null; student_id: string };
  category: { name: string } | null;
}

interface PaymentFormState {
  student_fee_id: string;
  amount_paid: string;
  payment_method: string;
  reference_number: string;
  notes: string;
  payment_date: string;
}

const EMPTY_FORM: PaymentFormState = {
  student_fee_id: '',
  amount_paid: '',
  payment_method: 'cash',
  reference_number: '',
  notes: '',
  payment_date: new Date().toISOString().split('T')[0],
};

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
];

export default function PaymentsPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showRecord, setShowRecord] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<{ data: PaymentRow[]; pagination: { totalPages: number; total: number } }>({
    queryKey: ['payments', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      const res = await api.get<PaymentRow[]>(`/api/v1/payments?${params}`);
      return { data: res.data as PaymentRow[], pagination: res.pagination! };
    },
  });

  const { data: pendingFeesData, isLoading: pendingFeesLoading } = useQuery<{ data: PendingStudentFee[] }>({
    queryKey: ['pending-student-fees'],
    queryFn: async () => {
      const res = await api.get<PendingStudentFee[]>('/api/v1/fees/pending?limit=100');
      return { data: res.data as PendingStudentFee[] };
    },
    enabled: showRecord,
  });

  const payments = data?.data || [];
  const pendingFees = pendingFeesData?.data || [];

  const recordMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/payments', body),
    onSuccess: () => {
      toast({ title: 'Payment recorded successfully' });
      setShowRecord(false);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['pending-student-fees'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const totalCollected = payments.reduce((sum: number, p: PaymentRow) => sum + (p.is_reversed ? 0 : p.amount_paid || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = payments.filter((p: PaymentRow) => !p.is_reversed && p.payment_date?.startsWith(todayStr)).length;
  const reversedCount = payments.filter((p: PaymentRow) => p.is_reversed).length;

  const columns: Column<PaymentRow>[] = [
    {
      key: 'receipt_number',
      header: 'Receipt Number',
      render: (row) => <span className="font-mono text-xs text-slate-700">{row.receipt_number}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.student?.first_name} {row.student?.last_name}
          </p>
          <p className="text-xs text-slate-500">{row.student?.student_id || '-'}</p>
        </div>
      ),
    },
    {
      key: 'amount_paid',
      header: 'Amount',
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.amount_paid)}</span>,
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (row) => <span className="text-slate-600 capitalize">{row.payment_method}</span>,
    },
    {
      key: 'payment_date',
      header: 'Date',
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.payment_date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.is_reversed ? 'cancelled' : 'completed'} />,
    },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Payments" description="Record and track fee payments" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard title="Total Collected" value={formatCurrency(totalCollected)} icon={CreditCard} description="From current page" color="green" />
        <StatCard title="Today's Payments" value={todayCount} icon={Receipt} description="Recorded today" color="blue" />
        <StatCard title="Reversed" value={reversedCount} icon={Receipt} description="Reversed payments" color="red" />
      </div>

      {isError ? (
        <ErrorState message="Failed to load payments" onRetry={() => refetch()} />
      ) : (
        <DataTable<PaymentRow>
          columns={columns}
          data={payments}
          isLoading={isLoading}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by receipt, student..."
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || 0}
          onPageChange={setPage}
          emptyMessage="No payments found"
          toolbar={
            <Button onClick={() => setShowRecord(true)}>
              <Plus className="h-4 w-4 mr-2" /> Record Payment
            </Button>
          }
          rowActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast({ title: `Receipt ${row.receipt_number}` })}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {!isLoading && payments.length === 0 && !isError && !search && (
        <div className="mt-4">
          <EmptyState
            title="No payments yet"
            description="Record your first payment to start tracking fee collections."
            action={
              <Button onClick={() => setShowRecord(true)}>
                <Plus className="h-4 w-4 mr-2" /> Record Payment
              </Button>
            }
          />
        </div>
      )}

      <RecordPaymentDialog
        open={showRecord}
        onOpenChange={setShowRecord}
        pendingFees={pendingFees}
        pendingFeesLoading={pendingFeesLoading}
        isSubmitting={recordMutation.isPending}
        onSubmit={(form) => {
          const body: Record<string, unknown> = {
            student_fee_id: form.student_fee_id,
            amount_paid: Number(form.amount_paid),
            payment_method: form.payment_method,
            reference_number: form.reference_number || null,
            notes: form.notes || null,
            payment_date: form.payment_date,
          };
          recordMutation.mutate(body);
        }}
      />
    </DashboardLayout>
  );
}

function RecordPaymentDialog({
  open,
  onOpenChange,
  pendingFees,
  pendingFeesLoading,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingFees: PendingStudentFee[];
  pendingFeesLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (form: PaymentFormState) => void;
}) {
  const [form, setForm] = useState<PaymentFormState>(EMPTY_FORM);

  // Reset form when dialog closes
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (!open) {
      setForm(EMPTY_FORM);
    }
  }

  const selectedFee = pendingFees.find((f) => f.id === form.student_fee_id) || null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description="Record a new fee payment"
      onSubmit={() => onSubmit(form)}
      submitLabel="Record"
      isSubmitting={isSubmitting}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Student Fee *</Label>
          <Select
            value={form.student_fee_id}
            onValueChange={(v) => {
              const fee = pendingFees.find((f) => f.id === v);
              setForm({
                ...form,
                student_fee_id: v,
                amount_paid: fee ? String(fee.balance_amount) : form.amount_paid,
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={pendingFeesLoading ? 'Loading...' : 'Select student fee'} />
            </SelectTrigger>
            <SelectContent>
              {pendingFees.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.student.first_name} {f.student.last_name} · {f.category?.name || 'Fee'} · Bal: {formatCurrency(f.balance_amount)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedFee && (
            <p className="text-xs text-slate-500">
              Current balance: {formatCurrency(selectedFee.balance_amount)}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Amount *</Label>
          <Input
            type="number"
            value={form.amount_paid}
            onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Method *</Label>
          <Select
            value={form.payment_method}
            onValueChange={(v) => setForm({ ...form, payment_method: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Reference Number</Label>
          <Input
            value={form.reference_number}
            onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
            placeholder="Cheque/Transaction no."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Payment Date *</Label>
          <Input
            type="date"
            value={form.payment_date}
            onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes..."
            rows={3}
          />
        </div>
      </div>
    </FormDialog>
  );
}
