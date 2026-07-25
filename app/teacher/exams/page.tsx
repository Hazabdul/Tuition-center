'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import {
  DataTable,
  type Column,
  StatusBadge,
  PageHeader,
  StatCard,
  EmptyState,
  ErrorState,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardList, Calendar, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ExamBatch {
  id: string;
  name: string;
  code: string;
}

interface ExamRow {
  id: string;
  name: string;
  code: string;
  batch_id: string;
  academic_year: string | null;
  start_date: string | null;
  end_date: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'published';
  batch?: { id: string; name: string; code: string } | null;
}

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

export default function TeacherExamsPage() {
  const api = useApi();
  const { toast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState<string>('all');

  // Fetch teacher's assigned batches for the filter dropdown
  const { data: batchesData, isLoading: batchesLoading } = useQuery<BatchOption[], Error>({
    queryKey: ['teacher-batches-list-exams'],
    queryFn: async () => {
      const res = await api.get<BatchOption[]>('/api/v1/teacher/batches?limit=100');
      return res.data as BatchOption[];
    },
  });

  // Fetch exams for the teacher's assigned batches
  const {
    data: exams,
    isLoading: examsLoading,
    isError: examsError,
    refetch: refetchExams,
  } = useQuery<ExamRow[], Error>({
    queryKey: ['teacher-exams'],
    queryFn: async () => {
      const res = await api.get<ExamRow[]>('/api/v1/teacher/exams?limit=100');
      return res.data as ExamRow[];
    },
  });

  const batches = batchesData ?? [];
  const allExams = exams ?? [];

  // Apply batch filter + search client-side
  const filteredExams = useMemo(() => {
    let rows = allExams;
    if (batchFilter !== 'all') {
      rows = rows.filter((e: ExamRow) => e.batch_id === batchFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (e: ExamRow) =>
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          (e.batch?.name ?? '').toLowerCase().includes(q),
      );
    }
    return rows;
  }, [allExams, batchFilter, search]);

  // Stat counts derived from the full (unfiltered) exam set
  const stats = useMemo(() => {
    const total = allExams.length;
    const scheduled = allExams.filter((e: ExamRow) => e.status === 'scheduled').length;
    const completed = allExams.filter((e: ExamRow) => e.status === 'completed').length;
    const published = allExams.filter((e: ExamRow) => e.status === 'published').length;
    return { total, scheduled, completed, published };
  }, [allExams]);

  const columns: Column<ExamRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
          {row.code}
        </span>
      ),
    },
    {
      key: 'batch',
      header: 'Batch',
      render: (row) =>
        row.batch ? (
          <span className="text-slate-700">{row.batch.name}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (row) => {
        if (!row.start_date && !row.end_date) {
          return <span className="text-slate-400">—</span>;
        }
        const start = row.start_date ? formatDate(row.start_date) : '—';
        const end = row.end_date ? formatDate(row.end_date) : '—';
        return (
          <span className="text-slate-600 whitespace-nowrap">
            {start} – {end}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const handleView = (exam: ExamRow) => {
    router.push(`/teacher/marks?exam_id=${exam.id}`);
  };

  const batchToolbar = (
    <Select value={batchFilter} onValueChange={setBatchFilter}>
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue placeholder={batchesLoading ? 'Loading batches...' : 'All batches'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All batches</SelectItem>
        {batches.map((b: BatchOption) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name} ({b.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const rowActions = (row: ExamRow) => (
    <Button variant="outline" size="sm" onClick={() => handleView(row)}>
      <Eye className="h-4 w-4 mr-1" />
      View
    </Button>
  );

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader
        title="Exam Schedule"
        description="View exams for your assigned batches"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Exams" value={stats.total} icon={ClipboardList} color="blue" />
        <StatCard title="Scheduled" value={stats.scheduled} icon={Calendar} color="blue" />
        <StatCard title="Completed" value={stats.completed} icon={ClipboardList} color="amber" />
        <StatCard title="Published" value={stats.published} icon={ClipboardList} color="green" />
      </div>

      {/* Error state */}
      {examsError && !examsLoading ? (
        <ErrorState
          message="Failed to load exams. Please try again."
          onRetry={() => refetchExams()}
        />
      ) : (
        <DataTable<ExamRow>
          columns={columns}
          data={filteredExams}
          isLoading={examsLoading}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search exams by name, code, or batch..."
          toolbar={batchToolbar}
          rowActions={rowActions}
          emptyMessage={
            batchFilter !== 'all' || search
              ? 'No exams match the selected filters.'
              : 'No exams have been scheduled for your batches yet.'
          }
        />
      )}

      {/* Empty state overlay when loaded and no exams at all */}
      {!examsLoading && !examsError && allExams.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="No exams scheduled"
            description="There are no exams scheduled for your assigned batches yet. Please check back later."
          />
        </div>
      )}
    </DashboardLayout>
  );
}
