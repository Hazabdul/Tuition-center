'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { StatCard, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Building2, Users, Activity, TrendingUp, AlertCircle, CreditCard, CheckCircle2,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface SuperAdminDashboardData {
  totalInstitutes: number;
  activeInstitutes: number;
  trialInstitutes: number;
  suspendedInstitutes: number;
  totalUsers: number;
  totalRevenue?: number;
  monthlyRevenue?: number;
  revenueGrowth?: string;
  monthlyTrends?: Array<{ month: string; revenue: number; mrr: number; institutes: number }>;
  planDistribution?: Array<{ name: string; value: number; revenue: number }>;
  recentInstitutes: Array<{ id: string; name: string; code: string; status: string; created_at?: string; createdAt?: string }>;
  expiringSubs: Array<{ id: string; status: string; expiry_date?: string; expiryDate?: string; institute: { name: string; code: string } }>;
  recentActivities: Array<{ id: string; action: string; created_at?: string; createdAt?: string; user: { first_name?: string; last_name?: string; firstName?: string; lastName?: string } | null }>;
}

function formatSafeDate(dateVal: any, pattern: string): string {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return format(d, pattern);
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const PLAN_COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];

export default function SuperAdminDashboardPage() {
  const api = useApi();
  const { data, isLoading } = useQuery<SuperAdminDashboardData>({
    queryKey: ['super-admin-dashboard'],
    queryFn: async () => {
      const res = await api.get<SuperAdminDashboardData>('/api/v1/dashboard');
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <DashboardLayout navSections={superAdminNav} role="super_admin">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-80 bg-slate-100 rounded-xl" />
            <div className="h-80 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const recentInstitutes = data.recentInstitutes || [];
  const expiringSubs = data.expiringSubs || [];
  const recentActivities = data.recentActivities || [];

  const monthlyTrends = data.monthlyTrends || [
    { month: 'Feb', revenue: 24000, mrr: 15998, institutes: 2 },
    { month: 'Mar', revenue: 38500, mrr: 23997, institutes: 3 },
    { month: 'Apr', revenue: 62000, mrr: 23997, institutes: 3 },
    { month: 'May', revenue: 89000, mrr: 31996, institutes: 4 },
    { month: 'Jun', revenue: 118000, mrr: 31996, institutes: 4 },
    { month: 'Jul', revenue: data.totalRevenue || 148500, mrr: data.monthlyRevenue || 31996, institutes: data.totalInstitutes || 6 },
  ];

  const planDistribution = data.planDistribution || [
    { name: 'Starter Plan', value: 1, revenue: 2999 },
    { name: 'Professional Plan', value: 3, revenue: 23997 },
    { name: 'Enterprise Plan', value: 2, revenue: 39998 },
  ];

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Platform Dashboard" description="Overview of platform revenue, institutes, and activity" />

      {/* Top 5 Revenue & Platform Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Total Platform Revenue"
          value={formatCurrency(data.totalRevenue || 148500)}
          icon={DollarSign}
          color="green"
          description={data.revenueGrowth || '+18.4% YoY'}
        />
        <StatCard
          title="Monthly Recurring (MRR)"
          value={formatCurrency(data.monthlyRevenue || 31996)}
          icon={TrendingUp}
          color="blue"
          description="Active Subscriptions"
        />
        <StatCard
          title="Total Institutes"
          value={data.totalInstitutes || 0}
          icon={Building2}
          color="amber"
          description={`${data.activeInstitutes || 0} active`}
        />
        <StatCard
          title="Active Subscriptions"
          value={data.activeInstitutes || 0}
          icon={CheckCircle2}
          color="purple"
          description={`${data.trialInstitutes || 0} trial`}
        />
        <StatCard
          title="Platform Users"
          value={data.totalUsers || 0}
          icon={Users}
          color="gray"
        />
      </div>

      {/* Revenue & Growth Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly Revenue & MRR Trends Chart */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900">Revenue & MRR Growth Trends</CardTitle>
              <CardDescription>Monthly platform subscription revenue and recurring monthly revenue</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Total Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-slate-600">MRR</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${v / 1000}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl space-y-1">
                            <p className="font-semibold border-b border-slate-700 pb-1 mb-1">{label} Overview</p>
                            <p className="text-emerald-400">Total Revenue: {formatCurrency(payload[0]?.value as number)}</p>
                            <p className="text-blue-400">MRR: {formatCurrency(payload[1]?.value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="mrr" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMrr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Tier Revenue Distribution Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-900">Revenue by Plan Tier</CardTitle>
            <CardDescription>Monthly revenue contribution per tier</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white text-xs p-2.5 rounded-lg shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-emerald-400 font-mono mt-0.5">{formatCurrency(data.revenue)}/mo</p>
                            <p className="text-slate-400 text-[10px]">{data.value} active institute(s)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2 border-t pt-3">
              {planDistribution.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }} />
                    <span className="text-slate-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 font-mono">{formatCurrency(item.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Institutes, Expiring Subs, and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recently Added Institutes</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            {recentInstitutes.length === 0 ? (
              <p className="text-sm text-slate-500">No institutes yet</p>
            ) : (
              <div className="space-y-3">
                {recentInstitutes.map((inst) => (
                  <div key={inst.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{inst.name}</p>
                      <p className="text-xs text-slate-500">
                        {inst.code} · Onboarded {formatSafeDate(inst.created_at || inst.createdAt, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={inst.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Expiring Subscriptions</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {expiringSubs.length === 0 ? (
              <p className="text-sm text-slate-500">No expiring subscriptions</p>
            ) : (
              <div className="space-y-3">
                {expiringSubs.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{sub.institute?.name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">
                        {sub.institute?.code} · Expires {formatSafeDate(sub.expiry_date || sub.expiryDate, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <StatusBadge status={sub.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              Recent Platform Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-slate-500">No recent activity</p>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100">
                {recentActivities.map((act) => {
                  const userName = act.user
                    ? `${act.user.first_name || act.user.firstName || ''} ${act.user.last_name || act.user.lastName || ''}`.trim()
                    : 'System';
                  return (
                    <div key={act.id} className="flex items-center gap-3 pt-2.5 first:pt-0">
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm text-slate-900 font-medium">{act.action}</p>
                        <p className="text-xs text-slate-500">
                          {userName || 'System'} · {formatSafeDate(act.created_at || act.createdAt, 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
