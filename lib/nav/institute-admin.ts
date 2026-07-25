import type { NavSection } from '@/components/layout/dashboard-layout';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  BarChart3,
  Bell,
  Settings,
  Activity,
  UserCheck,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

export const instituteAdminNav: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/institute-admin/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'People',
    items: [
      { label: 'Students', href: '/institute-admin/students', icon: GraduationCap },
      { label: 'Teachers', href: '/institute-admin/teachers', icon: Users },
      { label: 'Parents', href: '/institute-admin/parents', icon: UserCheck },
      { label: 'Users', href: '/institute-admin/users', icon: Users },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Batches', href: '/institute-admin/batches', icon: BookOpen },
      { label: 'Subjects', href: '/institute-admin/subjects', icon: BookOpen },
      { label: 'Attendance', href: '/institute-admin/attendance', icon: CalendarCheck },
      { label: 'Exams & Marks', href: '/institute-admin/exams', icon: ClipboardList },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Fee Categories', href: '/institute-admin/fee-categories', icon: CreditCard },
      { label: 'Fee Structures', href: '/institute-admin/fee-structures', icon: CreditCard },
      { label: 'Student Fees', href: '/institute-admin/student-fees', icon: DollarSign },
      { label: 'Payments', href: '/institute-admin/payments', icon: CreditCard },
      { label: 'Pending Fees', href: '/institute-admin/pending-fees', icon: AlertCircle },
      { label: 'Overdue Fees', href: '/institute-admin/overdue-fees', icon: AlertCircle },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Reports', href: '/institute-admin/reports', icon: BarChart3 },
      { label: 'Activity Logs', href: '/institute-admin/activity-logs', icon: Activity },
      { label: 'Settings', href: '/institute-admin/settings', icon: Settings },
    ],
  },
];
