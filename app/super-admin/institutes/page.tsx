'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { DataTable, type Column, ConfirmDialog, StatusBadge, PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Building2, Plus, MoreHorizontal, Eye, Pencil, Ban, CheckCircle, XCircle, Trash2, UserCheck, Sliders, CalendarPlus, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface InstituteRow {
  id: string;
  name: string;
  code: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state_region: string | null;
  country: string;
  status: string;
  student_limit: number;
  teacher_limit: number;
  admin_limit: number;
  created_at: string;
  subscription?: { status: string; expiry_date: string; plan: { name: string } | null } | null;
}

export default function InstitutesPage() {
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [quotaTarget, setQuotaTarget] = useState<InstituteRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstituteRow | null>(null);

  const { data, isLoading } = useQuery<{ data: InstituteRow[]; pagination: { total: number; totalPages: number } }>({
    queryKey: ['institutes', page, search, statusFilter, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20', search, sortBy, sortOrder });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<InstituteRow[]>(`/api/v1/institutes?${params}`);
      return { data: res.data as InstituteRow[], pagination: res.pagination! };
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (instituteId: string) => api.post<{ redirectPath: string }>('/api/v1/auth/super-admin/impersonate', { instituteId }),
    onSuccess: (res) => {
      toast({ title: 'Switching session to Institute Admin...' });
      window.location.href = res.data.redirectPath || '/institute-admin/dashboard';
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/api/v1/institutes/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/institutes/${id}`),
    onSuccess: () => {
      toast({ title: 'Institute deleted' });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['institutes'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  }

  const columns: Column<InstituteRow>[] = [
    {
      key: 'name',
      header: 'Institute',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500 font-mono">{row.code}</p>
        </div>
      ),
    },
    { key: 'city', header: 'Location', render: (row) => <span>{row.city || 'N/A'}, {row.country}</span> },
    {
      key: 'subscription',
      header: 'Subscription',
      render: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.subscription ? (
            <>
              <StatusBadge status={row.subscription.status} />
              <span className="text-xs text-slate-600 font-medium">{row.subscription.plan?.name || 'Pro Plan'}</span>
              <span className="text-[11px] text-slate-400">Exp: {format(new Date(row.subscription.expiry_date), 'MMM d, yyyy')}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">No active plan</span>
          )}
        </div>
      ),
    },
    { key: 'student_limit', header: 'Quotas (S / T / A)', render: (row) => <span className="text-xs font-mono">{row.student_limit} / {row.teacher_limit} / {row.admin_limit}</span> },
    { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
    { key: 'created_at', header: 'Onboarded', sortable: true, render: (row) => <span className="text-xs text-slate-500">{format(new Date(row.created_at), 'MMM d, yyyy')}</span> },
  ];

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader title="Institutes Directory" description="Manage multi-tenant institutes, onboarding, quotas, and impersonation" />

      <DataTable<InstituteRow>
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search institute by name, code, email..."
        page={page}
        totalPages={data?.pagination?.totalPages || 1}
        total={data?.pagination?.total || 0}
        onPageChange={setPage}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No institutes found"
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending_activation">Pending Activation</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowOnboarding(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Institutes
            </Button>
          </>
        }
        rowActions={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {row.status === 'pending_activation' ? (
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const res = await api.post(`/api/v1/institutes/${row.id}/activate`, {});
                      if (res.success) {
                        toast({ title: 'Institute Activated', description: 'Account and subscription plan activated successfully' });
                        queryClient.invalidateQueries({ queryKey: ['institutes'] });
                      }
                    } catch (err: any) {
                      toast({ title: 'Activation Failed', description: err.message, variant: 'destructive' });
                    }
                  }}
                  className="text-green-700 font-semibold bg-green-50 focus:bg-green-100"
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Activate Account & Plan
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => impersonateMutation.mutate(row.id)}
                  className="text-purple-600 font-semibold focus:text-purple-700 focus:bg-purple-50"
                >
                  <UserCheck className="mr-2 h-4 w-4" /> Log in as Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setQuotaTarget(row)}>
                <Sliders className="mr-2 h-4 w-4" /> Manage Quotas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/super-admin/institutes/${row.id}`)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/super-admin/institutes/${row.id}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit Institute
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {row.status === 'active' ? (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, status: 'suspended' })}>
                  <Ban className="mr-2 h-4 w-4 text-amber-600" /> Suspend Institute
                </DropdownMenuItem>
              ) : row.status !== 'pending_activation' && (
                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: row.id, status: 'active' })}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Activate Institute
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteTarget(row)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      {/* 1-Click Multi-Step Onboarding Wizard Modal */}
      <OnboardingWizardModal
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onSuccess={() => {
          setShowOnboarding(false);
          queryClient.invalidateQueries({ queryKey: ['institutes'] });
        }}
      />

      {/* Quotas & Subscription Management Drawer */}
      {quotaTarget && (
        <QuotaManagementDrawer
          institute={quotaTarget}
          open={!!quotaTarget}
          onOpenChange={(open) => !open && setQuotaTarget(null)}
          onSuccess={() => {
            setQuotaTarget(null);
            queryClient.invalidateQueries({ queryKey: ['institutes'] });
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Institute"
        description={`Are you sure you want to delete ${deleteTarget?.name}? This will soft-delete the institute and all its data.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        confirmLabel="Delete"
        variant="destructive"
        isSubmitting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}

{/* 1-Click Multi-Step Onboarding Wizard Component */ }
function OnboardingWizardModal({ open, onOpenChange, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const api = useApi();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; email: string; password: string } | null>(null);

  const [form, setForm] = useState({
    name: '', code: '', email: '', phone: '', address: '', city: 'Bangalore', country: 'India',
    planId: 'f0000000-0000-0000-0000-000000000002', studentLimit: 500, teacherLimit: 50, adminLimit: 5,
    adminFirstName: 'Dr. Admin', adminLastName: 'User', adminEmail: '', adminUsername: '', adminPassword: 'Password@123'
  });

  async function handleComplete() {
    setIsSubmitting(true);
    try {
      const res = await api.post<any>('/api/v1/institutes', form);
      if (res.success) {
        toast({ title: 'Institute & Admin Account Onboarded!' });
        if (res.data?.adminCredentials) {
          setCreatedCredentials(res.data.adminCredentials);
          setStep(4); // Show Credential summary step
        } else {
          onSuccess();
        }
      } else {
        toast({ title: res.message || 'Failed to onboard institute', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: err.message || 'Onboarding error', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <span>1-Click Institute Onboarding Wizard</span>
          </DialogTitle>
          <DialogDescription>
            Step {step} of 4 — {step === 1 ? 'Institute Information' : step === 2 ? 'Subscription & Limits' : step === 3 ? 'Primary Admin Account' : 'Credentials Created'}
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Steps Content */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Institute Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Pinnacle Prep School" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Institute Code *</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="PINNACLE01" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Institute Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="info@pinnacle.edu" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Phone Number *</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">City *</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="e.g. Bangalore" required />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Select Subscription Plan</Label>
              <Select value={form.planId} onValueChange={v => setForm({ ...form, planId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="f0000000-0000-0000-0000-000000000001">Starter Plan (100 Students / ₹2,999)</SelectItem>
                  <SelectItem value="f0000000-0000-0000-0000-000000000002">Professional Plan (500 Students / ₹7,999)</SelectItem>
                  <SelectItem value="f0000000-0000-0000-0000-000000000003">Enterprise Plan (5000 Students / ₹19,999)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Student Limit</Label>
                <Input type="number" value={form.studentLimit} onChange={e => setForm({ ...form, studentLimit: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Teacher Limit</Label>
                <Input type="number" value={form.teacherLimit} onChange={e => setForm({ ...form, teacherLimit: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Limit</Label>
                <Input type="number" value={form.adminLimit} onChange={e => setForm({ ...form, adminLimit: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Admin First Name</Label>
                <Input value={form.adminFirstName} onChange={e => setForm({ ...form, adminFirstName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Last Name</Label>
                <Input value={form.adminLastName} onChange={e => setForm({ ...form, adminLastName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Admin Username *</Label>
                <Input value={form.adminUsername} onChange={e => setForm({ ...form, adminUsername: e.target.value })} placeholder="admin" required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Admin Password</Label>
                <Input value={form.adminPassword} onChange={e => setForm({ ...form, adminPassword: e.target.value })} required />
              </div>
            </div>
          </div>
        )}

        {step === 4 && createdCredentials && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <CheckCircle className="h-5 w-5" />
              <span>Institute & Admin Account Ready!</span>
            </div>
            <div className="text-xs space-y-1 font-mono text-slate-800 bg-white p-3 rounded border">
              <p><strong>Code:</strong> {form.code}</p>
              <p><strong>Username:</strong> {createdCredentials.username}</p>
              <p><strong>Password:</strong> {createdCredentials.password}</p>
            </div>
            <p className="text-xs text-slate-500">Default grading rules (A+, A, B, C, D, F) have been automatically seeded.</p>
          </div>
        )}

        <DialogFooter className="mt-4">
          {step > 1 && step < 4 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
          )}
          {step < 3 && (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 1
                  ? !form.name.trim() || !form.code.trim() || !form.email.trim() || !form.phone.trim() || !form.city.trim()
                  : false
              }
            >
              Next Step →
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700" disabled={isSubmitting}>
              {isSubmitting ? 'Provisioning...' : 'Complete Onboarding'}
            </Button>
          )}
          {step === 4 && (
            <Button onClick={onSuccess} className="bg-blue-600">Close Wizard</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

{/* Quota & Subscription Management Drawer Component */ }
function QuotaManagementDrawer({ institute, open, onOpenChange, onSuccess }: {
  institute: InstituteRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const api = useApi();
  const { toast } = useToast();
  const [studentLimit, setStudentLimit] = useState(institute.student_limit);
  const [teacherLimit, setTeacherLimit] = useState(institute.teacher_limit);
  const [adminLimit, setAdminLimit] = useState(institute.admin_limit);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSaveQuotas() {
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/api/v1/institutes/${institute.id}/quotas`, {
        studentLimit, teacherLimit, adminLimit
      });
      if (res.success) {
        toast({ title: 'Quotas updated successfully' });
        onSuccess();
      }
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update quotas', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtendTrial() {
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/api/v1/institutes/${institute.id}/quotas`, { extendTrialDays: 14 });
      if (res.success) {
        toast({ title: 'Trial extended by 14 days!' });
        onSuccess();
      }
    } catch (err: any) {
      toast({ title: err.message || 'Trial extension failed', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-blue-600" />
            <span>Manage Quotas & Plan</span>
          </SheetTitle>
          <SheetDescription>{institute.name} ({institute.code})</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          <div className="space-y-1">
            <Label className="text-xs">Student Capacity Limit</Label>
            <Input type="number" value={studentLimit} onChange={e => setStudentLimit(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teacher Account Limit</Label>
            <Input type="number" value={teacherLimit} onChange={e => setTeacherLimit(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Admin Account Limit</Label>
            <Input type="number" value={adminLimit} onChange={e => setAdminLimit(parseInt(e.target.value) || 0)} />
          </div>

          <div className="pt-4 border-t space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Quick Actions</Label>
            <Button
              type="button"
              variant="outline"
              onClick={handleExtendTrial}
              disabled={isSubmitting}
              className="w-full justify-start text-xs border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              1-Click Extend Trial by 14 Days
            </Button>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button onClick={handleSaveQuotas} className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Quotas'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
