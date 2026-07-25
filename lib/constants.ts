import type { Role } from './types';

export const APP_NAME = 'EduManage';

export const ROLE_DASHBOARD_PATHS: Record<Role, string> = {
  super_admin: '/super-admin/dashboard',
  institute_admin: '/institute-admin/dashboard',
  teacher: '/teacher/dashboard',
  student: '/student/dashboard',
  parent: '/parent/dashboard',
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  institute_admin: 'Institute Admin',
  teacher: 'Teacher',
  student: 'Student',
  parent: 'Parent',
};

export const INSTITUTE_STATUSES = ['active', 'inactive', 'suspended', 'deleted'] as const;
export const SUBSCRIPTION_STATUSES = ['trial', 'active', 'expired', 'suspended', 'cancelled'] as const;
export const EXAM_STATUSES = ['draft', 'scheduled', 'completed', 'published'] as const;
export const FEE_STATUSES = ['unpaid', 'partially_paid', 'paid', 'overdue', 'waived'] as const;
export const ATTENDANCE_STATUSES = ['present', 'absent', 'late', 'leave'] as const;
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'card', 'online', 'cheque', 'other'] as const;

export const DEFAULT_GRADING_RULES = [
  { minPercentage: 90, maxPercentage: 100, grade: 'A+' },
  { minPercentage: 80, maxPercentage: 89.99, grade: 'A' },
  { minPercentage: 70, maxPercentage: 79.99, grade: 'B' },
  { minPercentage: 60, maxPercentage: 69.99, grade: 'C' },
  { minPercentage: 50, maxPercentage: 59.99, grade: 'D' },
  { minPercentage: 0, maxPercentage: 49.99, grade: 'F' },
];

export const STATUS_COLORS: Record<string, string> = {
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

export function formatStatus(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
