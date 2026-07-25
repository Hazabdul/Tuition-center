'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { DataTable, type Column, PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Child { id: string; first_name: string; last_name: string | null; student_id: string; }
interface ExamRow {
  id: string;
  name: string;
  code: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  batch?: { name: string } | null;
}

const columns: Column<ExamRow>[] = [
  { key: 'name', header: 'Exam Name', render: (r) => <span className="font-medium">{r.name}</span> },
  { key: 'code', header: 'Code', render: (r) => <Badge variant="outline" className="text-xs">{r.code}</Badge> },
  { key: 'batch', header: 'Batch', render: (r) => <span>{r.batch?.name || '—'}</span> },
  { key: 'start_date', header: 'Start Date', render: (r) => <span>{r.start_date ? formatDate(r.start_date) : '—'}</span> },
  { key: 'end_date', header: 'End Date', render: (r) => <span>{r.end_date ? formatDate(r.end_date) : '—'}</span> },
  { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
];

export default function ParentChildExamsPage() {
  const api = useApi();
  const [selectedChild, setSelectedChild] = useState<string>('');

  const { data: childrenData } = useQuery<{ children: Child[] }>({
    queryKey: ['parent-children-list'],
    queryFn: async () => { const res = await api.get<{ children: Child[] }>('/api/v1/dashboard'); return res.data; },
  });
  const children = childrenData?.children || [];

  const { data, isLoading } = useQuery({
    queryKey: ['parent-child-exams', selectedChild],
    enabled: !!selectedChild,
    queryFn: async () => {
      const res = await api.get<ExamRow[]>('/api/v1/exams?limit=50');
      return res.data || [];
    },
  });

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="Exam Schedule" description="View upcoming and past exams for your children" />

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
            <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Select a child to view exam schedule</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={data || []}
          isLoading={isLoading}
          emptyMessage="No exams found"
        />
      )}
    </DashboardLayout>
  );
}
