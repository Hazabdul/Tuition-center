'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navSections={studentNav} role="student">
      {children}
    </DashboardLayout>
  );
}
