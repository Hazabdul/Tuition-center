import type { NavSection } from '@/components/layout/dashboard-layout';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  BarChart3,
  Activity,
  Settings,
  Megaphone,
} from 'lucide-react';

export const superAdminNav: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
      { label: 'Institutes', href: '/super-admin/institutes', icon: Building2 },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Subscription Plans', href: '/super-admin/subscription-plans', icon: CreditCard },
      { label: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
      { label: 'Announcements', href: '/super-admin/announcements', icon: Megaphone },
      { label: 'Reports', href: '/super-admin/reports', icon: BarChart3 },
      { label: 'Activity Logs', href: '/super-admin/activity-logs', icon: Activity },
      { label: 'Settings', href: '/super-admin/settings', icon: Settings },
    ],
  },
];
