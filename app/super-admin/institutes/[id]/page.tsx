'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { StatusBadge, PageHeader, StatCard, ConfirmDialog } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Building2, GraduationCap, Users, Pencil, Ban, CheckCircle, XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

interface InstituteDetail {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  address: string | null;
  city: string | null;
  state_region: string | null;
  country: string;
  postal_code: string | null;
  logo_url: string | null;
  contact_person_name: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;
  status: string;
  student_limit: number;
  teacher_limit: number;
  admin_limit: number;
  notes: string | null;
  created_at: string;
  subscription: { id: string; status: string; start_date: string; expiry_date: string; plan: { name: string; code: string } | null } | null;
  usage: { students: number; teachers: number; admins: number };
  subscriptionHistory: Array<{ id: string; action: string; old_status: string | null; new_status: string | null; old_expiry: string | null; new_expiry: string | null; created_at: string; plan: { name: string } | null }>;
}

export default function InstituteDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: institute, isLoading } = useQuery<{ data: InstituteDetail }>({
    queryKey: ['institute', id],
    queryFn: async () => api.get(`/api/v1/institutes/${id}`),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/v1/institutes/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['institute', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  if (isLoading || !institute) {
    return (
      <DashboardLayout navSections={superAdminNav} role="super_admin">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const inst = institute.data;

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push('/super-admin/institutes')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Institutes
      </Button>

      <PageHeader title={inst.name} description={`Code: ${inst.code}`} />

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={inst.status} />
        {inst.subscription && <StatusBadge status={inst.subscription.status} />}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title="Students" value={`${inst.usage.students} / ${inst.student_limit}`} icon={GraduationCap} color="blue" />
        <StatCard title="Teachers" value={`${inst.usage.teachers} / ${inst.teacher_limit}`} icon={Users} color="green" />
        <StatCard title="Admins" value={`${inst.usage.admins} / ${inst.admin_limit}`} icon={Building2} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Email" value={inst.email} />
            <InfoRow label="Phone" value={inst.phone} />
            <InfoRow label="Alt Phone" value={inst.alt_phone} />
            <InfoRow label="Address" value={[inst.address, inst.city, inst.state_region, inst.country, inst.postal_code].filter(Boolean).join(', ')} />
            <InfoRow label="Contact Person" value={inst.contact_person_name} />
            <InfoRow label="Contact Phone" value={inst.contact_person_phone} />
            <InfoRow label="Contact Email" value={inst.contact_person_email} />
            <InfoRow label="Created" value={format(new Date(inst.created_at), 'MMM d, yyyy')} />
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inst.subscription ? (
              <>
                <InfoRow label="Plan" value={inst.subscription.plan?.name || 'N/A'} />
                <InfoRow label="Status" value={<StatusBadge status={inst.subscription.status} />} />
                <InfoRow label="Start Date" value={format(new Date(inst.subscription.start_date), 'MMM d, yyyy')} />
                <InfoRow label="Expiry Date" value={format(new Date(inst.subscription.expiry_date), 'MMM d, yyyy')} />
              </>
            ) : (
              <p className="text-sm text-slate-500">No subscription assigned</p>
            )}
            {inst.notes && <InfoRow label="Notes" value={inst.notes} />}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Subscription History</CardTitle>
        </CardHeader>
        <CardContent>
          {inst.subscriptionHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No subscription history</p>
          ) : (
            <div className="space-y-3">
              {inst.subscriptionHistory.map((h: InstituteDetail['subscriptionHistory'][number]) => (
                <div key={h.id} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900 capitalize">{h.action} — {h.plan?.name || 'N/A'}</p>
                    <p className="text-xs text-slate-500">
                      {h.old_status && `${h.old_status} → `}{h.new_status}
                      {h.new_expiry && ` · Exp: ${format(new Date(h.new_expiry), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{format(new Date(h.created_at), 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.push(`/super-admin/institutes/${id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {inst.status === 'active' ? (
          <Button variant="outline" onClick={() => statusMutation.mutate('suspended')}>
            <Ban className="h-4 w-4 mr-2" />
            Suspend
          </Button>
        ) : (
          <Button variant="outline" onClick={() => statusMutation.mutate('active')}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Activate
          </Button>
        )}
        {inst.status !== 'inactive' && (
          <Button variant="outline" onClick={() => statusMutation.mutate('inactive')}>
            <XCircle className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
        )}
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}
