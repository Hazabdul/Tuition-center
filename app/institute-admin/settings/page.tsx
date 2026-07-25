'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, BookOpen, CreditCard, MapPin, Phone, Mail, Globe } from 'lucide-react';

interface InstituteSettings {
  id: string;
  name: string;
  code: string;
  type: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  phone: string | null;
  alt_phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  status: string;
  established_year: number | null;
  student_limit: number | null;
  teacher_limit: number | null;
  parent_limit: number | null;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  start_date: string;
  expiry_date: string | null;
  max_students: number | null;
  max_teachers: number | null;
  plan?: { name: string; price: number } | null;
}

export default function InstituteAdminSettingsPage() {
  const api = useApi();

  const { data: institute, isLoading: loadingInstitute } = useQuery<InstituteSettings>({
    queryKey: ['institute-settings'],
    queryFn: async () => {
      const res = await api.get<InstituteSettings>('/api/v1/institutes/me');
      return res.data;
    },
  });

  const { data: subscription } = useQuery<SubscriptionInfo>({
    queryKey: ['institute-subscription'],
    queryFn: async () => {
      const res = await api.get<SubscriptionInfo>('/api/v1/institutes/me/subscription');
      return res.data;
    },
  });

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Institute Settings" description="Your institute configuration and subscription details" />

      {loadingInstitute ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Info */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-blue-600" />
                Institute Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{institute?.name}</h3>
                  <Badge variant="outline" className="text-xs mt-1">{institute?.code}</Badge>
                </div>
                <Badge className={
                  institute?.status === 'active' ? 'bg-green-100 text-green-700' :
                  institute?.status === 'suspended' ? 'bg-red-100 text-red-700' :
                  'bg-amber-100 text-amber-700'
                }>
                  {institute?.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400">Type</p>
                  <p className="font-medium capitalize">{institute?.type?.replace('_', ' ') || '—'}</p>
                </div>
                {institute?.established_year && (
                  <div>
                    <p className="text-xs text-slate-400">Established</p>
                    <p className="font-medium">{institute.established_year}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {(institute?.address || institute?.city) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-600">
                      {[institute?.address, institute?.city, institute?.state, institute?.country, institute?.pincode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {institute?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{institute.phone}</span>
                  </div>
                )}
                {institute?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{institute.email}</span>
                  </div>
                )}
                {institute?.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{institute.website}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Branding & Receipt Customization */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-purple-600" />
                Mark Sheet & Receipt Branding Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <p className="font-semibold text-slate-800">📄 Printable Document Formatting</p>
                <p className="text-slate-600">These brand headers and tagline settings are automatically rendered on printable Fee Receipts and Student Mark Sheets.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Official Tagline</p>
                <p className="text-sm font-medium text-slate-900 bg-white p-2 border rounded">Apex International — Excellence in Science & Technology</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Document Footer Disclaimer</p>
                <p className="text-xs text-slate-600 bg-white p-2 border rounded">Thank you for your payment. This is an official computer-generated receipt issued by Apex International Academy.</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!subscription ? (
                <p className="text-sm text-slate-500">No subscription information available</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{subscription.plan?.name || 'Current Plan'}</span>
                    <Badge className={
                      subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                      subscription.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                      subscription.status === 'expired' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {subscription.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Start Date</p>
                      <p className="font-medium">{subscription.start_date}</p>
                    </div>
                    {subscription.expiry_date && (
                      <div>
                        <p className="text-xs text-slate-400">Expiry Date</p>
                        <p className="font-medium">{subscription.expiry_date}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
