import type { NavSection } from '@/components/layout/dashboard-layout';
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  PenSquare,
  BarChart3,
  Bell,
  User,
  Users,
  History,
  Megaphone,
} from 'lucide-react';

export const teacherNav: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'My Assignments',
    items: [
      { label: 'My Batches', href: '/teacher/batches', icon: GraduationCap },
      { label: 'My Subjects', href: '/teacher/subjects', icon: BookOpen },
      { label: 'My Students', href: '/teacher/students', icon: Users },
    ],
  },
  {
    title: 'Academics',
    items: [
      { label: 'Class Announcements', href: '/teacher/announcements', icon: Megaphone },
      { label: 'Take Attendance', href: '/teacher/attendance', icon: CalendarCheck },
      { label: 'Attendance History', href: '/teacher/attendance/history', icon: History },
      { label: 'Exam Schedule', href: '/teacher/exams', icon: ClipboardList },
      { label: 'Enter Marks', href: '/teacher/marks', icon: PenSquare },
      { label: 'Student Performance', href: '/teacher/performance', icon: BarChart3 },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', href: '/teacher/profile', icon: User },
      { label: 'Notifications', href: '/teacher/notifications', icon: Bell },
    ],
  },
];
