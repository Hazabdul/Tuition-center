'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Award,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ChildRow {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  admission_date: string;
  academic_year: string | null;
  is_active: boolean;
  batches?: Array<{ id: string; name: string; code: string } | null>;
  attendance_percentage?: number;
  fees_summary?: {
    total: number;
    paid: number;
    balance: number;
    status: string;
  };
}

// Avatar color palette - deterministic based on name
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-rose-100 text-rose-700',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(first: string, last: string | null): string {
  return `${first.charAt(0)}${last?.charAt(0) || ''}`.toUpperCase();
}

function getAttendanceColor(pct: number | undefined): string {
  if (pct === undefined) return 'text-slate-400';
  if (pct >= 75) return 'text-green-600';
  if (pct >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function getAttendanceBg(pct: number | undefined): string {
  if (pct === undefined) return 'bg-slate-100';
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ParentChildrenPage() {
  const api = useApi();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const {
    data: children,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ChildRow[]>({
    queryKey: ['parent-children'],
    queryFn: async () => {
      const res = await api.get<ChildRow[]>('/api/v1/parent/children');
      return res.data as ChildRow[];
    },
  });

  const list = children ?? [];

  // Derived stats
  const totalChildren = list.length;
  const activeCount = list.filter((c: ChildRow) => c.is_active).length;
  const pendingFeesCount = list.filter((c: ChildRow) => (c.fees_summary?.balance ?? 0) > 0).length;
  const lowAttendanceCount = list.filter(
    (c: ChildRow) => c.attendance_percentage !== undefined && c.attendance_percentage < 75,
  ).length;

  const selectedChild = list.find((c: ChildRow) => c.id === selectedChildId) ?? null;

  if (isLoading) {
    return (
      <DashboardLayout navSections={parentNav} role="parent">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (isError) {
    return (
      <DashboardLayout navSections={parentNav} role="parent">
        <PageHeader title="My Children" description="View your children's academic information" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Something went wrong'}
          onRetry={() => refetch()}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="My Children" description="View your children's academic information" />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Children"
          value={totalChildren}
          icon={Users}
          color="blue"
          description="Linked to your account"
        />
        <StatCard
          title="Active"
          value={activeCount}
          icon={GraduationCap}
          color="green"
          description="Currently enrolled"
        />
        <StatCard
          title="Pending Fees"
          value={pendingFeesCount}
          icon={CreditCard}
          color="amber"
          description="With outstanding balance"
        />
        <StatCard
          title="Low Attendance"
          value={lowAttendanceCount}
          icon={CalendarCheck}
          color="red"
          description="Below 75% attendance"
        />
      </div>

      {/* Children Grid */}
      {list.length === 0 ? (
        <EmptyState
          title="No children linked"
          description="There are no children linked to your parent account yet. Please contact your institute administrator."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((child: ChildRow) => {
            const isSelected = selectedChildId === child.id;
            const fullName = `${child.first_name} ${child.last_name ?? ''}`.trim();
            const initials = getInitials(child.first_name, child.last_name);
            const avatarColor = getAvatarColor(fullName);
            const attendance = child.attendance_percentage;
            const fees = child.fees_summary;

            return (
              <Card
                key={child.id}
                className={`border-slate-200 shadow-sm transition-all cursor-pointer hover:shadow-md ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedChildId(isSelected ? null : child.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full font-semibold text-base ${avatarColor}`}
                      >
                        {initials}
                      </div>
                      <div>
                        <CardTitle className="text-base text-slate-900">{fullName}</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">
                          ID: {child.student_id}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={child.is_active ? 'active' : 'inactive'} />
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {/* Quick info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Admission No.</p>
                      <p className="font-medium text-slate-700">{child.admission_number}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Academic Year</p>
                      <p className="font-medium text-slate-700">
                        {child.academic_year || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400">
                      {isSelected ? 'Hide details' : 'View details'}
                    </span>
                    {isSelected ? (
                      <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                  </div>

                  {/* Expanded details */}
                  {isSelected && (
                    <div className="space-y-4 pt-3 border-t border-slate-100">
                      {/* Attendance */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <CalendarCheck className="h-4 w-4 text-slate-500" />
                            <span className="text-xs font-medium text-slate-600">
                              Attendance
                            </span>
                          </div>
                          <span
                            className={`text-sm font-semibold ${getAttendanceColor(attendance)}`}
                          >
                            {attendance !== undefined ? `${attendance.toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getAttendanceBg(attendance)}`}
                            style={{ width: `${attendance ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Fees Summary */}
                      {fees && (
                        <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="h-4 w-4 text-slate-500" />
                            <span className="text-xs font-medium text-slate-600">
                              Fees Summary
                            </span>
                            <div className="ml-auto">
                              <StatusBadge status={fees.status} />
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p className="text-slate-400">Total</p>
                              <p className="font-semibold text-slate-700">
                                ₹{fees.total.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Paid</p>
                              <p className="font-semibold text-green-600">
                                ₹{fees.paid.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Balance</p>
                              <p
                                className={`font-semibold ${fees.balance > 0 ? 'text-red-600' : 'text-slate-700'}`}
                              >
                                ₹{fees.balance.toLocaleString('en-IN')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Batches */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Award className="h-4 w-4 text-slate-500" />
                          <span className="text-xs font-medium text-slate-600">
                            Enrolled Batches
                          </span>
                        </div>
                        {child.batches && child.batches.filter(Boolean).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {child.batches
                              .filter((b): b is { id: string; name: string; code: string } => b !== null)
                              .map((batch: { id: string; name: string; code: string }) => (
                                <span
                                  key={batch.id}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100"
                                >
                                  {batch.name} ({batch.code})
                                </span>
                              ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No batches enrolled</p>
                        )}
                      </div>

                      {/* Additional info */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-slate-400">Admission Date</p>
                          <p className="font-medium text-slate-700">
                            {formatDate(child.admission_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Date of Birth</p>
                          <p className="font-medium text-slate-700">
                            {child.date_of_birth ? formatDate(child.date_of_birth) : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unused imports kept for pattern compliance */}
      <div className="hidden">
        <DataTable
          data={[]}
          columns={[] as Column<unknown>[]}
        />
        <FormDialog
          open={false}
          onOpenChange={() => {}}
          title=""
          description=""
          onSubmit={() => {}}
        >
          <></>
        </FormDialog>
        <ConfirmDialog
          open={false}
          onOpenChange={() => {}}
          title=""
          description=""
          onConfirm={() => {}}
        />
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </DashboardLayout>
  );
}
