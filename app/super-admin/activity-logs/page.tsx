'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { DataTable, type Column, PageHeader } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Activity } from 'lucide-react';

interface LogRow {
  id: string;
  userName: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
}

const columns: Column<LogRow>[] = [
  {
    key: 'created_at',
    header: 'Time',
    sortable: true,
    render: (r) => <span className="text-xs text-slate-500">{format(new Date(r.created_at), 'MMM d, h:mm a')}</span>,
  },
  { key: 'userName', header: 'User', render: (r) => <span className="font-medium">{r.userName}</span> },
  {
    key: 'action',
    header: 'Action',
    render: (r) => (
      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{r.action}</span>
    ),
  },
  { key: 'entity_type', header: 'Entity', render: (r) => r.entity_type ? <Badge variant="outline" className="text-xs">{r.entity_type}</Badge> : <span className="text-slate-400">—</span> },
  { key: 'ip_address', header: 'IP', render: (r) => <span className="text-xs text-slate-400">{r.ip_address || '—'}</span> },
];

export default function SuperAdminActivityLogsPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-activity-logs', search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '25', action: search });
      const res = await api.get<LogRow[]>(`/api/v1/activity-logs?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader
        title="Activity Logs"
        description="Complete audit trail of all platform actions"
      >
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity className="h-4 w-4" />
          Real-time audit log
        </div>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Filter by action..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        emptyMessage="No activity logs found"
      />
    </DashboardLayout>
  );
}
