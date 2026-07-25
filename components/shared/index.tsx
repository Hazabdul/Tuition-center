export { DataTable, type Column } from './data-table';
export { FormDialog, ConfirmDialog, EmptyState, ErrorState } from './dialogs';

import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'gray' | 'purple';
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-slate-100 text-slate-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    suspended: 'bg-red-100 text-red-700 border-red-200',
    deleted: 'bg-gray-100 text-gray-500 border-gray-200',
    trial: 'bg-blue-100 text-blue-700 border-blue-200',
    expired: 'bg-orange-100 text-orange-700 border-orange-200',
    cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
    draft: 'bg-gray-100 text-gray-600 border-gray-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-amber-100 text-amber-700 border-amber-200',
    published: 'bg-green-100 text-green-700 border-green-200',
    unpaid: 'bg-red-100 text-red-700 border-red-200',
    partially_paid: 'bg-amber-100 text-amber-700 border-amber-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    waived: 'bg-gray-100 text-gray-600 border-gray-200',
    present: 'bg-green-100 text-green-700 border-green-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    late: 'bg-amber-100 text-amber-700 border-amber-200',
    leave: 'bg-blue-100 text-blue-700 border-blue-200',
  };

  const formatted = status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status] || STATUS_COLORS.inactive}`}>
      {formatted}
    </span>
  );
}
