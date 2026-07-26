'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader, StatCard, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, TrendingUp, AlertTriangle, ShieldCheck, CreditCard, Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PIE_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];

interface FinancialReportData {
  mrr: number;
  arr: number;
  churnRate: number;
  arpu: number;
  totalInstitutes: number;
  activeInstitutes: number;
  suspendedInstitutes: number;
  revenueTrend: { month: string; revenue: number; institutes: number }[];
  transactions: {
    id: string;
    receiptNumber: string;
    instituteName: string;
    instituteCode: string;
    planName: string;
    amount: number;
    status: string;
    paymentMethod: string;
    date: string;
  }[];
}

export default function SuperAdminReportsPage() {
  const api = useApi();

  const { data, isLoading } = useQuery<FinancialReportData>({
    queryKey: ['super-admin-financial-reports'],
    queryFn: async () => {
      const res = await api.get<FinancialReportData>('/api/v1/reports/super-admin');
      return res.data;
    },
  });

  const statusPieData = [
    { name: 'Active', value: data?.activeInstitutes || 0 },
    { name: 'Trial', value: 1 },
    { name: 'Suspended', value: data?.suspendedInstitutes || 0 },
  ];

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader
        title="Financial Intelligence & Platform Analytics"
        description="Monitor MRR, ARR, subscription churn, and financial ledger"
      />

      {/* Financial Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Monthly Recurring (MRR)"
          value={`₹${(data?.mrr || 0).toLocaleString()}`}
          icon={DollarSign}
          color="green"
          description="+12% from last month"
        />
        <StatCard
          title="Annual Recurring (ARR)"
          value={`₹${(data?.arr || 0).toLocaleString()}`}
          icon={TrendingUp}
          color="blue"
          description="Projected annual run rate"
        />
        <StatCard
          title="Platform Churn Rate"
          value={`${data?.churnRate || 0}%`}
          icon={AlertTriangle}
          color="amber"
          description="Suspended / Cancelled ratio"
        />
        <StatCard
          title="Average Rev / User (ARPU)"
          value={`₹${(data?.arpu || 0).toLocaleString()}`}
          icon={ShieldCheck}
          color="purple"
          description="Per active institute"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        {/* Revenue Growth Trend Area Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Monthly Revenue Growth Trend (12 Months)</span>
              <span className="text-xs font-normal text-slate-500">Currency: INR (₹)</span>
            </CardTitle>
            <CardDescription>Historical and projected monthly recurring revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-slate-50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.revenueTrend || []}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip formatter={(val: number) => [`₹${val.toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Institute Health Pie Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Institute Health Ratio</CardTitle>
            <CardDescription>Active vs Suspended institutes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 bg-slate-50 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription Payment Ledger Table */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            <span>Subscription Transactions Ledger</span>
          </CardTitle>
          <CardDescription>Recent payment collections and invoice statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Institute</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Gateway</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.transactions || []).map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs font-medium text-slate-700">{t.receiptNumber}</TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900">{t.instituteName}</div>
                    <div className="text-xs text-slate-400">{t.instituteCode}</div>
                  </TableCell>
                  <TableCell className="text-xs">{t.planName}</TableCell>
                  <TableCell className="font-semibold text-slate-900">₹{(Number(t.amount) || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-slate-500">{t.paymentMethod}</TableCell>
                  <TableCell className="text-xs text-slate-500">{t.date}</TableCell>
                  <TableCell>
                    <StatusBadge status={t.status.toLowerCase()} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
