import type { NavSection } from '@/components/layout/dashboard-layout';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  ClipboardList,
  Award,
  TrendingUp,
  Bell,
  User,
  Receipt,
} from 'lucide-react';

export const parentNav: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard },
      { label: 'My Children', href: '/parent/children', icon: Users },
    ],
  },
  {
    title: 'Child Info',
    items: [
      { label: 'Attendance', href: '/parent/children/attendance', icon: CalendarCheck },
      { label: 'Fees & Payments', href: '/parent/children/fees', icon: CreditCard },
      { label: 'Payment History', href: '/parent/children/payments', icon: Receipt },
      { label: 'Exam Schedule', href: '/parent/children/exams', icon: ClipboardList },
      { label: 'Marks', href: '/parent/children/marks', icon: Award },
      { label: 'Performance', href: '/parent/children/performance', icon: TrendingUp },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/parent/profile', icon: User },
      { label: 'Notifications', href: '/parent/notifications', icon: Bell },
    ],
  },
];
