'use client';

import { useState, useMemo } from 'react';
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
import {
  ClipboardList,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExamSubject {
  id: string;
  subject_id: string;
  exam_date: string | null;
  start_time: string | null;
  end_time: string | null;
  max_marks: number;
  passing_marks: number;
  subject?: { id: string; name: string; code: string } | null;
}

interface ExamRow {
  id: string;
  name: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'published';
  exam_subjects?: ExamSubject[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(time: string | null): string {
  if (!time) return '—';
  try {
    // API returns "HH:mm:ss" or an ISO string; normalize to a 12-hour display.
    const date = new Date(`1970-01-01T${time.slice(0, 8)}Z`);
    if (Number.isNaN(date.getTime())) return time;
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  } catch {
    return time;
  }
}

function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  return formatTime(start ?? end);
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  if (start && end && start !== end) {
    return `${formatDate(start)} – ${formatDate(end)}`;
  }
  return formatDate((start ?? end) as string);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentExamsPage() {
  const api = useApi();
  const { toast } = useToast();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // -------------------------------------------------------------------------
  // Exams query
  // -------------------------------------------------------------------------

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ExamRow[]>({
    queryKey: ['student-exams'],
    queryFn: async () => {
      const res = await api.get<ExamRow[]>('/api/v1/student/exams');
      if (!res.success) {
        throw new Error('Failed to load exam schedule');
      }
      return res.data as ExamRow[];
    },
    meta: {
      onError: (err: Error) => {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      },
    },
  });

  const exams = data ?? [];

  // -------------------------------------------------------------------------
  // Derived stats
  // -------------------------------------------------------------------------

  const stats = useMemo(() => {
    const total = exams.length;
    const upcoming = exams.filter((e: ExamRow) => e.status === 'scheduled').length;
    const completed = exams.filter((e: ExamRow) => e.status === 'completed').length;
    const published = exams.filter((e: ExamRow) => e.status === 'published').length;
    return { total, upcoming, completed, published };
  }, [exams]);

  // -------------------------------------------------------------------------
  // Expand / collapse helpers
  // -------------------------------------------------------------------------

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // -------------------------------------------------------------------------
  // Table columns
  // -------------------------------------------------------------------------

  const columns: Column<ExamRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Exam Name',
        render: (row) => (
          <span className="font-semibold text-slate-900">{row.name}</span>
        ),
      },
      {
        key: 'code',
        header: 'Code',
        render: (row) => (
          <span className="font-mono text-sm text-slate-600">{row.code}</span>
        ),
      },
      {
        key: 'dates',
        header: 'Dates',
        render: (row) => (
          <span className="text-slate-600">
            {formatDateRange(row.start_date, row.end_date)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <StatusBadge status={row.status} />,
      },
    ],
    [],
  );

  // -------------------------------------------------------------------------
  // Row actions (View Details toggle)
  // -------------------------------------------------------------------------

  const rowActions = (row: ExamRow) => {
    const isExpanded = expandedIds.has(row.id);
    const hasSubjects = (row.exam_subjects?.length ?? 0) > 0;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => toggleExpanded(row.id)}
        disabled={!hasSubjects}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Hide details' : 'View details'}
      >
        {isExpanded ? (
          <>
            <ChevronUp className="mr-1 h-4 w-4" />
            Hide
          </>
        ) : (
          <>
            <ChevronDown className="mr-1 h-4 w-4" />
            View Details
          </>
        )}
      </Button>
    );
  };

  // -------------------------------------------------------------------------
  // Expanded subjects panel (rendered below the DataTable for each expanded row)
  // -------------------------------------------------------------------------

  function renderSubjectsPanel(exam: ExamRow) {
    const subjects = exam.exam_subjects ?? [];
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <h4 className="text-sm font-semibold text-slate-800">
            Subjects — {exam.name}
          </h4>
          <span className="text-xs text-slate-400">
            ({subjects.length} subject{subjects.length === 1 ? '' : 's'})
          </span>
        </div>

        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500">
            No subjects have been scheduled for this exam yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                    Subject
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                    Exam Date
                  </th>
                  <th className="text-left px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                    Time
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                    Max Marks
                  </th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-600 whitespace-nowrap">
                    Passing Marks
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-slate-900">
                        {s.subject?.name ?? '—'}
                      </div>
                      {s.subject?.code && (
                        <div className="font-mono text-xs text-slate-400">
                          {s.subject.code}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {s.exam_date ? formatDate(s.exam_date) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                      {formatTimeRange(s.start_time, s.end_time)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-slate-900 whitespace-nowrap">
                      {s.max_marks}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600 whitespace-nowrap">
                      {s.passing_marks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Exam Schedule"
          description="View your upcoming and past exams"
        />

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Exams"
            value={stats.total}
            icon={ClipboardList}
            color="blue"
            description={`${stats.total} exam${stats.total === 1 ? '' : 's'}`}
          />
          <StatCard
            title="Upcoming"
            value={stats.upcoming}
            icon={Calendar}
            color={stats.upcoming > 0 ? 'amber' : 'gray'}
            description={stats.upcoming > 0 ? 'Scheduled' : 'None scheduled'}
          />
          <StatCard
            title="Completed"
            value={stats.completed}
            icon={Clock}
            color={stats.completed > 0 ? 'purple' : 'gray'}
          />
          <StatCard
            title="Published"
            value={stats.published}
            icon={MapPin}
            color={stats.published > 0 ? 'green' : 'gray'}
            description={stats.published > 0 ? 'Results available' : 'No results yet'}
          />
        </div>

        {/* Exams table + expanded detail panels */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4 sm:p-6 space-y-4">
            {isError ? (
              <ErrorState
                message={
                  error instanceof Error
                    ? error.message
                    : 'Failed to load exam schedule'
                }
                onRetry={() => refetch()}
              />
            ) : !isLoading && exams.length === 0 ? (
              <EmptyState
                title="No exams scheduled"
                description="Your exam schedule will appear here once exams are published. Please check back later or contact the administration office."
              />
            ) : (
              <>
                <DataTable
                  columns={columns}
                  data={exams}
                  isLoading={isLoading}
                  rowActions={rowActions}
                  searchPlaceholder="Search exams..."
                  emptyMessage="No exams found"
                />

                {/* Expanded subject panels */}
                {!isLoading &&
                  exams
                    .filter((e: ExamRow) => expandedIds.has(e.id))
                    .map((exam: ExamRow) => (
                      <div key={exam.id} className="mt-2">
                        {renderSubjectsPanel(exam)}
                      </div>
                    ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
