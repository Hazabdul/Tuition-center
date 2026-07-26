'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      {children}
    </DashboardLayout>
  );
}
