'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, CreditCard, Globe, Pencil, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface InstituteSettings {
  id: string;
  name: string;
  code: string;
  address: string | null;
  city: string | null;
  stateRegion: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  altPhone: string | null;
  email: string | null;
  logoUrl: string | null;
  status: string;
  studentLimit: number | null;
  teacherLimit: number | null;
  adminLimit: number | null;
}

interface SubscriptionInfo {
  id: string;
  status: string;
  start_date: string;
  expiry_date: string | null;
  plan?: { name: string; price: number } | null;
}

export default function InstituteAdminSettingsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

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

  const [form, setForm] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    address: '',
    city: '',
    stateRegion: '',
    country: 'India',
    postalCode: '',
  });

  useEffect(() => {
    if (institute) {
      setForm({
        name: institute.name || '',
        phone: institute.phone || '',
        altPhone: institute.altPhone || '',
        email: institute.email || '',
        address: institute.address || '',
        city: institute.city || '',
        stateRegion: institute.stateRegion || '',
        country: institute.country || 'India',
        postalCode: institute.postalCode || '',
      });
    }
  }, [institute]);

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.put('/api/v1/institutes/me', body),
    onSuccess: () => {
      toast.success('Institute settings updated successfully');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['institute-settings'] });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update institute settings'),
  });

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Institute Settings" description="Manage your institute configuration and profile details" />

      {loadingInstitute ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {[...Array(2)].map((_, i) => <div key={i} className="h-64 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Institute Profile & Edit Form */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-blue-600" />
                Institute Profile & Settings
              </CardTitle>
              <Button
                variant={isEditing ? 'ghost' : 'outline'}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{institute?.name}</h3>
                  <Badge variant="outline" className="text-xs mt-1">Code: {institute?.code}</Badge>
                </div>
                <Badge className={
                  institute?.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                  institute?.status === 'suspended' ? 'bg-red-100 text-red-700 border-red-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                }>
                  {institute?.status}
                </Badge>
              </div>

              {isEditing ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    updateMutation.mutate(form);
                  }}
                  className="space-y-3 pt-2"
                >
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Institute Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Phone</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Alt Phone</Label>
                      <Input
                        value={form.altPhone}
                        onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Email Address</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Address</Label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">City</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">State / Region</Label>
                      <Input
                        value={form.stateRegion}
                        onChange={(e) => setForm({ ...form, stateRegion: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Country</Label>
                      <Input
                        value={form.country}
                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Postal Code</Label>
                      <Input
                        value={form.postalCode}
                        onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending}>
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Profile Changes
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded border">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Email</p>
                      <p className="font-medium text-slate-900">{institute?.email || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Phone</p>
                      <p className="font-medium text-slate-900">{institute?.phone || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">City / State</p>
                      <p className="font-medium text-slate-900">{[institute?.city, institute?.stateRegion].filter(Boolean).join(', ') || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Country / Postal</p>
                      <p className="font-medium text-slate-900">{[institute?.country, institute?.postalCode].filter(Boolean).join(' - ') || '—'}</p>
                    </div>
                  </div>

                  {institute?.address && (
                    <div className="p-3 bg-slate-50 rounded border">
                      <p className="text-xs text-slate-400 font-medium">Full Address</p>
                      <p className="font-medium text-slate-900 mt-0.5">{institute.address}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                    <div className="p-2 bg-blue-50 border border-blue-100 rounded">
                      <p className="text-blue-600 font-semibold">Student Quota</p>
                      <p className="text-base font-bold text-blue-950 mt-0.5">{institute?.studentLimit || 100}</p>
                    </div>
                    <div className="p-2 bg-purple-50 border border-purple-100 rounded">
                      <p className="text-purple-600 font-semibold">Teacher Quota</p>
                      <p className="text-base font-bold text-purple-950 mt-0.5">{institute?.teacherLimit || 20}</p>
                    </div>
                    <div className="p-2 bg-amber-50 border border-amber-100 rounded">
                      <p className="text-amber-600 font-semibold">Admin Quota</p>
                      <p className="text-base font-bold text-amber-950 mt-0.5">{institute?.adminLimit || 3}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document Branding & Receipt Customization */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4 text-purple-600" />
                Branding & Receipt Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                <p className="font-semibold text-slate-800">📄 Printable Document Headers</p>
                <p className="text-slate-600">Your official institute name, email, phone, and address are automatically rendered on student mark sheets and fee receipts.</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Official Tagline</p>
                <p className="text-sm font-medium text-slate-900 bg-white p-2 border rounded">
                  {institute?.name} — Excellence in Education & Academic Achievement
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Receipt Footer Disclaimer</p>
                <p className="text-xs text-slate-600 bg-white p-2 border rounded">
                  Thank you for your payment. This is an official computer-generated receipt issued by {institute?.name}.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Details */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-blue-600" />
                Subscription Plan Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!subscription ? (
                <p className="text-sm text-slate-500">No active subscription plan found</p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-lg">{subscription.plan?.name || 'Professional Plan'}</span>
                      <p className="text-xs text-slate-500 mt-0.5">Active tier subscription</p>
                    </div>
                    <Badge className={
                      subscription.status === 'active' ? 'bg-green-100 text-green-700 border-green-200' :
                      subscription.status === 'trial' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      subscription.status === 'expired' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {subscription.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                    <div>
                      <p className="text-xs text-slate-400">Start Date</p>
                      <p className="font-medium">{subscription.start_date || '—'}</p>
                    </div>
                    {subscription.expiry_date && (
                      <div>
                        <p className="text-xs text-slate-400">Expiration Date</p>
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
