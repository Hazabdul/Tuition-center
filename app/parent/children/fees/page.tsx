'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Child { id: string; first_name: string; last_name: string | null; student_id: string; }
interface FeeRecord {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: string;
  category?: { name: string } | null;
}

export default function ParentChildFeesPage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => { const res = await api.get<{ children: Child[] }>('/api/v1/dashboard'); return res.data; },
  });
  const children = childrenData?.children || [];

  const { data: feesData, isLoading } = useQuery({
    queryKey: ['parent-child-fees', selectedChild],
    enabled: !!selectedChild,
    queryFn: async () => {
      const params = new URLSearchParams({ studentId: selectedChild });
      const res = await api.get<FeeRecord[]>(`/api/v1/student-fees?${params}`);
      return res.data || [];
    },
  });

  const totalOwed = (feesData || []).reduce((s, f) => s + Number(f.total_amount), 0);
  const totalPaid = (feesData || []).reduce((s, f) => s + Number(f.paid_amount), 0);
  const totalBalance = (feesData || []).reduce((s, f) => s + Number(f.balance_amount), 0);

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Child Fees" description="View fee details for your children" />

      <div className="mb-6">
        <Select value={selectedChild} onValueChange={setSelectedChild}>
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
            <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a child to view fees</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Total Fees</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(totalOwed)}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Paid</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-slate-400 mb-1">Balance</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(totalBalance)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            {(feesData || []).map((fee) => (
              <Card key={fee.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{fee.category?.name || 'General Fee'}</p>
                    {fee.due_date && <p className="text-xs text-slate-500 mt-0.5">Due: {formatDate(fee.due_date)}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="text-xs text-slate-400">Paid / Total</p>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(fee.paid_amount))} / {formatCurrency(Number(fee.total_amount))}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Balance</p>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(Number(fee.balance_amount))}</p>
                    </div>
                    <Badge className={
                      fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                      fee.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }>
                      {fee.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {feesData?.length === 0 && (
              <Card><CardContent className="py-12 text-center text-slate-400">No fee records found</CardContent></Card>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
