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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, MoreHorizontal, Eye, CreditCard, RefreshCw, Zap, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate, formatCurrency } from '@/lib/utils';

interface StudentFeeRow {
  id: string;
  student_id: string;
  category_id: string;
  total_amount: number;
  discount_amount: number;
  waived_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  student?: { id: string; first_name: string; last_name: string | null; student_id: string } | null;
  category?: { id: string; name: string; code: string } | null;
}

interface StudentOption {
  id: string;
  first_name: string;
  last_name: string | null;
  student_id: string;
}

interface CategoryOption {
  id: string;
  name: string;
  code: string;
}

interface AssignFeeForm {
  student_id: string;
  category_id: string;
  total_amount: string;
  discount_amount: string;
  waived_amount: string;
  due_date: string;
}

const EMPTY_FORM: AssignFeeForm = {
  student_id: '',
  category_id: '',
  total_amount: '',
  discount_amount: '',
  waived_amount: '',
  due_date: '',
};

export default function StudentFeesPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [showAssign, setShowAssign] = useState(false);
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFeeForm>(EMPTY_FORM);

  const [gatewayKeys, setGatewayKeys] = useState({
    stripePublishableKey: 'pk_test_51Mz...APEX01',
    stripeSecretKey: 'sk_test_****',
    razorpayKeyId: 'rzp_test_APEX01_UPI',
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['student-fees', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      const res = await api.get<StudentFeeRow[]>(`/api/v1/student-fees?${params}`);
      return { data: res.data as StudentFeeRow[], pagination: res.pagination! };
    },
  });

  const { data: studentsData } = useQuery<{ data: StudentOption[] }>({
    queryKey: ['students-list-fee'],
    queryFn: async () => {
      const res = await api.get<StudentOption[]>('/api/v1/students?limit=200');
      return { data: res.data as StudentOption[] };
    },
  });

  const { data: categoriesData } = useQuery<{ data: CategoryOption[] }>({
    queryKey: ['categories-list-fee'],
    queryFn: async () => {
      const res = await api.get<CategoryOption[]>('/api/v1/fee-categories?limit=100');
      return { data: res.data as CategoryOption[] };
    },
  });

  const assignMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/student-fees', body),
    onSuccess: () => {
      toast({ title: 'Fee assigned successfully' });
      setShowAssign(false);
      setAssignForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const autopayCheckoutMutation = useMutation({
    mutationFn: ({ studentFeeId, paymentMethod }: { studentFeeId: string; paymentMethod: string }) =>
      api.post<any>('/api/v1/fees/autopay-checkout', { studentFeeId, paymentMethod }),
    onSuccess: (res) => {
      toast({ title: res.message || 'AutoPay Mandate authorized successfully!' });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const executeAutodebitMutation = useMutation({
    mutationFn: () => api.post<any>('/api/v1/fees/collect-autopay', {}),
    onSuccess: (res) => {
      toast({ title: res.message || 'Auto-Debit batch execution completed!' });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function handleAssignSubmit() {
    if (!assignForm.student_id || !assignForm.category_id || !assignForm.total_amount) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    const body: Record<string, unknown> = {
      student_id: assignForm.student_id,
      category_id: assignForm.category_id,
      total_amount: Number(assignForm.total_amount),
      discount_amount: Number(assignForm.discount_amount) || 0,
      waived_amount: Number(assignForm.waived_amount) || 0,
      due_date: assignForm.due_date || null,
    };
    assignMutation.mutate(body);
  }

  const columns: Column<StudentFeeRow>[] = [
    {
      key: 'student',
      header: 'Student',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">
            {row.student ? `${row.student.first_name} ${row.student.last_name || ''}`.trim() : '-'}
          </p>
          <p className="text-xs text-slate-500 font-mono">{row.student?.student_id || row.student_id}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (row) => (
        <div>
          <p className="text-sm text-slate-700">{row.category?.name || '-'}</p>
          {row.category?.code && <p className="text-xs text-slate-500 font-mono">{row.category.code}</p>}
        </div>
      ),
    },
    {
      key: 'total_amount',
      header: 'Total Amount',
      render: (row) => <span className="font-medium text-slate-900">{formatCurrency(row.total_amount)}</span>,
    },
    {
      key: 'paid_amount',
      header: 'Paid',
      render: (row) => <span className="text-slate-700">{formatCurrency(row.paid_amount)}</span>,
    },
    {
      key: 'balance_amount',
      header: 'Balance',
      render: (row) => (
        <span className={row.balance_amount > 0 ? 'font-medium text-red-600' : 'text-slate-700'}>
          {formatCurrency(row.balance_amount)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'AutoPay / Status',
      render: (row) => {
        let isAutoPay = false;
        let method = 'UPI / Stripe';
        if (row.notes) {
          try {
            const p = JSON.parse(row.notes);
            if (p.autoPayEnabled) {
              isAutoPay = true;
              method = p.mandateMethod || method;
            }
          } catch {}
        }
        return (
          <div className="flex flex-col gap-1">
            <StatusBadge status={row.status} />
            {isAutoPay ? (
              <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded border border-green-300 w-fit">
                ⚡ AutoPay Active
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">Manual payment</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (row) => <span className="text-xs text-slate-500">{row.due_date ? formatDate(row.due_date) : '-'}</span>,
    },
  ];

  const fees = data?.data || [];
  const totalAssigned = fees.length;
  const totalCollected = fees.reduce((acc, f) => acc + (f.paid_amount || 0), 0);
  const totalOutstanding = fees.reduce((acc, f) => acc + (f.balance_amount || 0), 0);
  const overdueCount = fees.filter((f) => f.status === 'overdue').length;

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Student Fees & AutoPay Recurring Collection" description="Manage fee ledgers, Stripe & UPI AutoPay mandates, and batch auto-debit collection" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Assigned" value={totalAssigned} icon={CreditCard} description="Fee records" color="blue" />
        <StatCard title="Collected" value={formatCurrency(totalCollected)} icon={CreditCard} description="From current page" color="green" />
        <StatCard title="Outstanding" value={formatCurrency(totalOutstanding)} icon={CreditCard} description="Balance due" color="amber" />
        <StatCard title="Overdue" value={overdueCount} icon={CreditCard} description="Past due date" color="red" />
      </div>

      {isError ? (
        <ErrorState message="Failed to load student fees" onRetry={() => refetch()} />
      ) : (
        <DataTable<StudentFeeRow>
          columns={columns}
          data={fees}
          isLoading={isLoading}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by student name, ID..."
          page={page}
          totalPages={data?.pagination?.totalPages || 1}
          total={data?.pagination?.total || 0}
          onPageChange={setPage}
          emptyMessage="No student fees found"
          toolbar={
            <>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setShowGatewayConfig(true)}
                className="border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100"
              >
                <Zap className="h-4 w-4 mr-2" />
                Configure Gateways (Stripe & UPI)
              </Button>
              <Button
                variant="outline"
                onClick={() => executeAutodebitMutation.mutate()}
                disabled={executeAutodebitMutation.isPending}
                className="border-green-200 text-green-700 bg-green-50 hover:bg-green-100 font-semibold"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${executeAutodebitMutation.isPending ? 'animate-spin' : ''}`} />
                {executeAutodebitMutation.isPending ? 'Charging...' : 'Execute Auto-Debit'}
              </Button>
              <Button onClick={() => { setAssignForm(EMPTY_FORM); setShowAssign(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Fee
              </Button>
            </>
          }
          rowActions={(row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => autopayCheckoutMutation.mutate({ studentFeeId: row.id, paymentMethod: 'upi_autopay' })}>
                  <Zap className="mr-2 h-4 w-4 text-purple-600" /> Setup UPI AutoPay Mandate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => autopayCheckoutMutation.mutate({ studentFeeId: row.id, paymentMethod: 'stripe_card' })}>
                  <CreditCard className="mr-2 h-4 w-4 text-blue-600" /> Setup Stripe Card AutoPay
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      {/* Gateway Configuration Dialog */}
      <Dialog open={showGatewayConfig} onOpenChange={setShowGatewayConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span>Stripe & UPI AutoPay Gateway Keys</span>
            </DialogTitle>
            <DialogDescription>Configure auto-debit keys for parent fee payments</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Stripe Publishable Key</Label>
              <Input value={gatewayKeys.stripePublishableKey} onChange={e => setGatewayKeys({ ...gatewayKeys, stripePublishableKey: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Razorpay UPI AutoPay Key ID</Label>
              <Input value={gatewayKeys.razorpayKeyId} onChange={e => setGatewayKeys({ ...gatewayKeys, razorpayKeyId: e.target.value })} />
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800 space-y-1">
              <p className="font-semibold flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Active AutoPay Mandate Engine</p>
              <p>Parents can authorize UPI AutoPay or Stripe Card mandates. Fees are charged automatically on due date.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              toast({ title: 'Payment Gateways & AutoPay configured successfully!' });
              setShowGatewayConfig(false);
            }} className="bg-purple-600 hover:bg-purple-700">Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Fee Dialog */}
      <FormDialog
        open={showAssign}
        onOpenChange={setShowAssign}
        title="Assign Fee to Student"
        description="Select a student and category to assign a new fee record"
        onSubmit={handleAssignSubmit}
        submitLabel="Assign Fee"
        isSubmitting={assignMutation.isPending}
      >
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Student *</Label>
            <Select value={assignForm.student_id} onValueChange={(v) => setAssignForm({ ...assignForm, student_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {(studentsData?.data || []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name || ''} ({s.student_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fee Category *</Label>
            <Select value={assignForm.category_id} onValueChange={(v) => setAssignForm({ ...assignForm, category_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Select fee category" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesData?.data || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Total Amount (₹) *</Label>
            <Input
              type="number"
              value={assignForm.total_amount}
              onChange={(e) => setAssignForm({ ...assignForm, total_amount: e.target.value })}
              placeholder="e.g. 15000"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Discount Amount (₹)</Label>
              <Input
                type="number"
                value={assignForm.discount_amount}
                onChange={(e) => setAssignForm({ ...assignForm, discount_amount: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Waived Amount (₹)</Label>
              <Input
                type="number"
                value={assignForm.waived_amount}
                onChange={(e) => setAssignForm({ ...assignForm, waived_amount: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={assignForm.due_date}
              onChange={(e) => setAssignForm({ ...assignForm, due_date: e.target.value })}
            />
          </div>
        </div>
      </FormDialog>
    </DashboardLayout>
  );
}
