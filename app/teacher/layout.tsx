'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      {children}
    </DashboardLayout>
  );
}
