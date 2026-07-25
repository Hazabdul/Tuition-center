'use client';

import { useState, useMemo } from 'react';
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
import { useApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Check, X, Clock, CalendarOff, TrendingUp } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttendanceRow {
  id: string;
  date: string;
  batch_id: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  remarks: string | null;
  batch?: { id: string; name: string; code: string } | null;
}

interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  leave_days: number;
  attendance_percentage: number;
}

type StatusFilter = 'all' | 'present' | 'absent' | 'late' | 'leave';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<
  AttendanceRow['status'],
  { variant: 'success' | 'danger' | 'warning' | 'info'; label: string }
> = {
  present: { variant: 'success', label: 'Present' },
  absent: { variant: 'danger', label: 'Absent' },
  late: { variant: 'warning', label: 'Late' },
  leave: { variant: 'info', label: 'Leave' },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentAttendancePage() {
  const api = useApi();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // -------------------------------------------------------------------------
  // Attendance records query (with client-side status filter applied)
  // -------------------------------------------------------------------------

  const {
    data: attendanceData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['student', 'attendance', page, statusFilter],
    queryFn: async () => {
      const res = await api.get<AttendanceRow[]>(
        `/api/v1/student/attendance?page=${page}&limit=${PAGE_SIZE}${
          statusFilter !== 'all' ? `&status=${statusFilter}` : ''
        }`,
      );
      return {
        records: (res.data as AttendanceRow[]) ?? [],
        pagination: res.pagination,
      };
    },
    placeholderData: (prev) => prev,
  });

  // -------------------------------------------------------------------------
  // Summary query — drives the StatCards at the top of the page.
  // The endpoint returns aggregated counts; we fall back to computing the
  // summary from the currently loaded records if the summary call fails or
  // returns nothing.
  // -------------------------------------------------------------------------

  const { data: summaryData } = useQuery({
    queryKey: ['student', 'attendance', 'summary'],
    queryFn: async () => {
      const res = await api.get<AttendanceSummary>(
        '/api/v1/student/attendance/summary',
      );
      return res.data as AttendanceSummary | undefined;
    },
    retry: 1,
  });

  // -------------------------------------------------------------------------
  // Derived summary — prefer server-provided summary, otherwise compute
  // from the currently loaded page of records (best-effort).
  // -------------------------------------------------------------------------

  const summary = useMemo<AttendanceSummary>(() => {
    if (summaryData && typeof summaryData.attendance_percentage === 'number') {
      return summaryData;
    }

    const records = attendanceData?.records ?? [];
    const present = records.filter((r: AttendanceRow) => r.status === 'present').length;
    const absent = records.filter((r: AttendanceRow) => r.status === 'absent').length;
    const late = records.filter((r: AttendanceRow) => r.status === 'late').length;
    const leave = records.filter((r: AttendanceRow) => r.status === 'leave').length;
    const total = present + absent + late + leave;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total_days: total,
      present_days: present,
      absent_days: absent,
      late_days: late,
      leave_days: leave,
      attendance_percentage: percentage,
    };
  }, [summaryData, attendanceData]);

  // -------------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------------

  const columns: Column<AttendanceRow>[] = useMemo(
    () => [
      {
        key: 'date',
        header: 'Date',
        render: (row) => (
          <span className="font-medium text-foreground">
            {formatDate(row.date)}
          </span>
        ),
      },
      {
        key: 'batch',
        header: 'Batch',
        render: (row) => (
          <span className="text-foreground">
            {row.batch?.name ?? '—'}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => {
          const meta = STATUS_VARIANTS[row.status];
          return (
            <StatusBadge status={meta.label} />
          );
        },
      },
      {
        key: 'remarks',
        header: 'Remarks',
        render: (row) => (
          <span className="text-sm text-muted-foreground">
            {row.remarks ?? '—'}
          </span>
        ),
      },
    ],
    [],
  );

  // -------------------------------------------------------------------------
  // Pagination helpers
  // -------------------------------------------------------------------------

  const pagination = attendanceData?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const currentPage = pagination?.current_page ?? page;
  const totalItems = pagination?.total_items ?? attendanceData?.records.length ?? 0;
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const records = attendanceData?.records ?? [];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="My Attendance"
          description="View your attendance history"
        />

        {/* Summary StatCards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            title="Overall Attendance"
            value={`${summary.attendance_percentage}%`}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            title="Present Days"
            value={summary.present_days}
            icon={Check}
            color="green"
          />
          <StatCard
            title="Absent Days"
            value={summary.absent_days}
            icon={X}
            color="red"
          />
          <StatCard
            title="Late Days"
            value={summary.late_days}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Leave Days"
            value={summary.leave_days}
            icon={CalendarOff}
            color="purple"
          />
        </div>

        {/* Attendance table */}
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">
                  Attendance Records
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as StatusFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="leave">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error */}
            {isError && !isLoading ? (
              <ErrorState
                message={
                  error instanceof Error
                    ? error.message
                    : 'Something went wrong. Please try again.'
                }
                onRetry={() => refetch()}
              />
            ) : /* Empty */ !isLoading && records.length === 0 ? (
              <EmptyState
                title="No attendance records"
                description={
                  statusFilter === 'all'
                    ? 'Your attendance history will appear here once records are added.'
                    : `No ${statusFilter} records found. Try a different filter.`
                }
              />
            ) : (
              <>
                {/* Table */}
                <DataTable
                  columns={columns}
                  data={records}
                  isLoading={isLoading}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages} · {totalItems}{' '}
                      {totalItems === 1 ? 'record' : 'records'}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!canPrev || isFetching}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={!canNext || isFetching}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
