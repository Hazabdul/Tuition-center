'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';

export default function InstituteAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      {children}
    </DashboardLayout>
  );
}
