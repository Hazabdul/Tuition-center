'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, PageHeader, EmptyState, ErrorState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarCheck, Filter, X, CalendarDays, Users, UserCheck, UserX, Clock, CalendarOff } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface AttendanceSummaryRow {
  id: string;
  date: string;
  batch_id: string;
  batch_name: string;
  present_count: number;
  absent_count: number;
  late_count: number;
  leave_count: number;
}

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

export default function AttendanceHistoryPage() {
  const api = useApi();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const limit = 20;

  // Fetch attendance summary rows
  const { data, isLoading, isError, error, refetch } = useQuery<{
    rows: AttendanceSummaryRow[];
    pagination: { totalPages: number; total: number };
  }>({
    queryKey: ['attendance-history', page, search, batchFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search) params.set('search', search);
      if (batchFilter && batchFilter !== 'all') params.set('batch_id', batchFilter);
      if (fromDate) params.set('from_date', fromDate);
      if (toDate) params.set('to_date', toDate);

      const res = await api.get<AttendanceSummaryRow[]>(`/api/v1/attendance?${params}`);
      return {
        rows: res.data as AttendanceSummaryRow[],
        pagination: res.pagination ?? { totalPages: 1, total: (res.data as AttendanceSummaryRow[]).length },
      };
    },
  });

  // Fetch batches for the filter dropdown
  const { data: batchesData } = useQuery<{ batches: BatchOption[] }>({
    queryKey: ['batches-list-attendance'],
    queryFn: async () => {
      const res = await api.get<BatchOption[]>('/api/v1/batches?limit=100');
      return { batches: res.data as BatchOption[] };
    },
  });

  const rows = data?.rows ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  // Aggregate stats across the current page
  const totals = rows.reduce(
    (acc: { present: number; absent: number; late: number; leave: number }, r: AttendanceSummaryRow) => {
      acc.present += r.present_count;
      acc.absent += r.absent_count;
      acc.late += r.late_count;
      acc.leave += r.leave_count;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 },
  );

  function handleClearFilters() {
    setBatchFilter('all');
    setFromDate('');
    setToDate('');
    setSearch('');
    setPage(1);
  }

  const hasActiveFilters =
    batchFilter !== 'all' || fromDate !== '' || toDate !== '' || search !== '';

  const tableColumns: Column<AttendanceSummaryRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => (
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{formatDate(row.date)}</span>
        </div>
      ),
    },
    {
      key: 'batch_name',
      header: 'Batch',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-slate-400" />
          <span className="text-slate-700">{row.batch_name}</span>
        </div>
      ),
    },
    {
      key: 'present_count',
      header: 'Present',
      render: (row) => <CountBadge value={row.present_count} variant="present" />,
    },
    {
      key: 'absent_count',
      header: 'Absent',
      render: (row) => <CountBadge value={row.absent_count} variant="absent" />,
    },
    {
      key: 'late_count',
      header: 'Late',
      render: (row) => <CountBadge value={row.late_count} variant="late" />,
    },
    {
      key: 'leave_count',
      header: 'Leave',
      render: (row) => <CountBadge value={row.leave_count} variant="leave" />,
    },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader
        title="Attendance History"
        description="View and filter attendance summaries across batches and date ranges"
      />

      {/* Summary stat cards for the current page */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryStat
          label="Present"
          value={totals.present}
          icon={UserCheck}
          color="green"
        />
        <SummaryStat
          label="Absent"
          value={totals.absent}
          icon={UserX}
          color="red"
        />
        <SummaryStat
          label="Late"
          value={totals.late}
          icon={Clock}
          color="amber"
        />
        <SummaryStat
          label="On Leave"
          value={totals.leave}
          icon={CalendarOff}
          color="blue"
        />
      </div>

      {/* Filter card */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Batch filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">Batch</Label>
              <Select
                value={batchFilter}
                onValueChange={(v) => {
                  setBatchFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All batches</SelectItem>
                  {(batchesData?.batches ?? []).map((b: BatchOption) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">From date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* To date */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">To date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Clear button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      {isError ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load attendance history'}
              onRetry={() => refetch()}
            />
          </CardContent>
        </Card>
      ) : !isLoading && rows.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-0">
            <EmptyState
              title="No attendance records found"
              description={
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters to see more results.'
                  : 'Attendance summaries will appear here once attendance is marked.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" onClick={handleClearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <DataTable<AttendanceSummaryRow>
          columns={tableColumns}
          data={rows}
          isLoading={isLoading}
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          searchPlaceholder="Search by batch or date..."
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          emptyMessage="No attendance records found"
        />
      )}
    </DashboardLayout>
  );
}

/**
 * Colored count badge for attendance counts.
 * Uses the same color mapping as StatusBadge (present=green, absent=red, late=amber, leave=blue).
 */
function CountBadge({
  value,
  variant,
}: {
  value: number;
  variant: 'present' | 'absent' | 'late' | 'leave';
}) {
  const colorClasses: Record<string, string> = {
    present: 'bg-green-100 text-green-700 border-green-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    late: 'bg-amber-100 text-amber-700 border-amber-200',
    leave: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[2rem] px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses[variant]}`}
    >
      {value}
    </span>
  );
}

/**
 * Compact summary stat card for the current page totals.
 */
function SummaryStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'amber' | 'blue';
}) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClasses[color]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
