'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Shield, Globe, Bell, Database, Mail } from 'lucide-react';

const settingsSections = [
  {
    icon: Shield,
    title: 'Security',
    description: 'Platform-level security settings',
    color: 'bg-blue-50 text-blue-600',
    settings: [
      { label: 'JWT Token Expiry', value: '15 minutes', type: 'info' },
      { label: 'Refresh Token Expiry', value: '7 days', type: 'info' },
      { label: 'Max Login Attempts', value: '5', type: 'info' },
      { label: 'Password Min Length', value: '8 characters', type: 'info' },
    ],
  },
  {
    icon: Globe,
    title: 'Platform',
    description: 'General platform configuration',
    color: 'bg-green-50 text-green-600',
    settings: [
      { label: 'Platform Name', value: 'EduManage', type: 'info' },
      { label: 'Default Currency', value: 'INR (₹)', type: 'info' },
      { label: 'Default Timezone', value: 'Asia/Kolkata', type: 'info' },
      { label: 'Multi-Tenant Mode', value: 'Enabled', type: 'success' },
    ],
  },
  {
    icon: Database,
    title: 'Database',
    description: 'Backend configuration overview',
    color: 'bg-purple-50 text-purple-600',
    settings: [
      { label: 'Database', value: 'PostgreSQL via Supabase', type: 'info' },
      { label: 'Row Level Security', value: 'Enabled', type: 'success' },
      { label: 'Backups', value: 'Managed by Supabase', type: 'info' },
      { label: 'ORM', value: 'Prisma (schema applied)', type: 'info' },
    ],
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Notification delivery configuration',
    color: 'bg-amber-50 text-amber-600',
    settings: [
      { label: 'In-App Notifications', value: 'Enabled', type: 'success' },
      { label: 'Email Notifications', value: 'Configure SMTP', type: 'warning' },
      { label: 'SMS Notifications', value: 'Not configured', type: 'warning' },
    ],
  },
];

export default function SuperAdminSettingsPage() {
  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Platform Settings" description="View and manage global platform configuration" />

      <div className="grid gap-6 lg:grid-cols-2">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${section.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.settings.map((setting) => (
                    <div key={setting.label} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">{setting.label}</span>
                      <Badge
                        className={
                          setting.type === 'success' ? 'bg-green-100 text-green-700 border-green-200' :
                          setting.type === 'warning' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }
                      >
                        {setting.value}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">Environment Configuration</p>
            <p className="text-sm text-blue-700 mt-1">
              Sensitive settings (API keys, SMTP credentials, JWT secrets) are managed via environment variables (.env file).
              Do not store secrets in the database.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
