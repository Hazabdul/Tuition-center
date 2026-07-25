import type { NavSection } from '@/components/layout/dashboard-layout';
import {
  LayoutDashboard,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  Award,
  BarChart3,
  Bell,
  User,
  BookOpen,
  GraduationCap,
  Receipt,
  TrendingUp,
} from 'lucide-react';

export const studentNav: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'My Batch', href: '/student/batch', icon: GraduationCap },
      { label: 'My Subjects', href: '/student/subjects', icon: BookOpen },
      { label: 'My Attendance', href: '/student/attendance', icon: CalendarCheck },
      { label: 'Exam Schedule', href: '/student/exams', icon: ClipboardList },
      { label: 'My Marks', href: '/student/marks', icon: Award },
      { label: 'Performance', href: '/student/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'My Fees', href: '/student/fees', icon: CreditCard },
      { label: 'Payment History', href: '/student/fees/payments', icon: Receipt },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/student/profile', icon: User },
      { label: 'Notifications', href: '/student/notifications', icon: Bell },
    ],
  },
];
