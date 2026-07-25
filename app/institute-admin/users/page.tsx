'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { DataTable, type Column, PageHeader, StatusBadge } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserRow {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  username: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  institute_admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

const columns: Column<UserRow>[] = [
  {
    key: 'first_name',
    header: 'Name',
    sortable: true,
    render: (r) => <span className="font-medium">{r.first_name} {r.last_name || ''}</span>,
  },
  { key: 'username', header: 'Username', render: (r) => <span className="font-mono text-sm">{r.username}</span> },
  { key: 'email', header: 'Email', render: (r) => <span className="text-sm">{r.email || '—'}</span> },
  { key: 'phone', header: 'Phone', render: (r) => <span className="text-sm text-slate-500">{r.phone || '—'}</span> },
  {
    key: 'role',
    header: 'Role',
    render: (r) => (
      <Badge className={
        r.role === 'institute_admin' ? 'bg-purple-100 text-purple-700' :
        r.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
        r.role === 'student' ? 'bg-green-100 text-green-700' :
        'bg-amber-100 text-amber-700'
      }>
        {ROLE_LABELS[r.role] || r.role}
      </Badge>
    ),
  },
  { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'inactive'} /> },
];

export default function InstituteAdminUsersPage() {
  const api = useApi();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['institute-users', search, roleFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search });
      if (roleFilter !== 'all') params.set('role', roleFilter);
      const res = await api.get<UserRow[]>(`/api/v1/users?${params}`);
      return res;
    },
  });

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Users" description="All user accounts in your institute" />

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, email or username..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        emptyMessage="No users found"
        toolbar={
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="institute_admin">Admin</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
            </SelectContent>
          </Select>
        }
      />
    </DashboardLayout>
  );
}
