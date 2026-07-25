'use client';

import { use, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader, StatusBadge, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Building2, Users, GraduationCap, BookOpen, CreditCard, ClipboardList,
  UserCheck, Sliders, Ban, CheckCircle, ArrowLeft, Mail, Phone, MapPin, Calendar, Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

interface DetailsData {
  institute: {
    id: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    status: string;
    student_limit: number;
    teacher_limit: number;
    admin_limit: number;
    created_at: string;
  };
  subscription?: {
    status: string;
    start_date: string;
    expiry_date: string;
    plan: { name: string; monthly_price: number } | null;
  } | null;
  teachers: { id: string; employee_id: string; first_name: string; last_name: string; email: string; phone: string; qualification: string; specialization: string; joining_date: string }[];
  students: { id: string; student_id: string; admission_number: string; first_name: string; last_name: string; email: string; phone: string; gender: string; parents: { first_name: string; last_name: string; phone: string; relationship: string }[] }[];
  batches: { id: string; name: string; code: string; academic_year: string; capacity: number; enrolledCount: number }[];
  subjects: { id: string; name: string; code: string; max_marks: number; passing_marks: number }[];
  exams: { id: string; name: string; code: string; academic_year: string; start_date: string; status: string; totalEntries: number; passEntries: number; passRate: number }[];
  feeSummary: {
    totalAssigned: number;
    totalCollected: number;
    pending: number;
    recentPayments: { id: string; receipt_number: string; amount_paid: number; payment_date: string; payment_method: string }[];
  };
}

export default function InstituteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const api = useApi();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = useQuery<DetailsData>({
    queryKey: ['institute-details-360', id],
    queryFn: async () => {
      const res = await api.get<DetailsData>(`/api/v1/institutes/${id}/details`);
      return res.data;
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: (instId: string) => api.post<{ redirectPath: string }>('/api/v1/auth/super-admin/impersonate', { instituteId: instId }),
    onSuccess: (res) => {
      toast({ title: 'Switching session to Institute Admin...' });
      window.location.href = res.data.redirectPath || '/institute-admin/dashboard';
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/v1/institutes/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      queryClient.invalidateQueries({ queryKey: ['institute-details-360', id] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const inst = data?.institute;
  const sub = data?.subscription;

  const studentCount = data?.students.length || 0;
  const teacherCount = data?.teachers.length || 0;
  const studentPct = inst ? Math.round((studentCount / inst.student_limit) * 100) : 0;
  const teacherPct = inst ? Math.round((teacherCount / inst.teacher_limit) * 100) : 0;

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/super-admin/institutes')} className="text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Directory
        </Button>
      </div>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white flex-shrink-0">
            <Building2 className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{inst?.name || 'Loading Institute...'}</h1>
              <StatusBadge status={inst?.status || 'active'} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold">{inst?.code}</span>
              <span>📍 {inst?.city || 'N/A'}, {inst?.country}</span>
              <span>Plan: <strong className="text-blue-600">{sub?.plan?.name || 'Pro'}</strong></span>
            </div>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => impersonateMutation.mutate(id)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            Log in as Admin
          </Button>
          {inst?.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate('suspended')}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 text-xs"
            >
              <Ban className="h-4 w-4 mr-1.5" /> Suspend
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate('active')}
              className="border-green-300 text-green-700 hover:bg-green-50 text-xs"
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> Activate
            </Button>
          )}
        </div>
      </div>

      {/* 6 Multi-Tab Resource Inspection Suite */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 grid grid-cols-3 sm:grid-cols-6 w-full">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="teachers" className="text-xs">Teachers ({teacherCount})</TabsTrigger>
          <TabsTrigger value="students" className="text-xs">Students ({studentCount})</TabsTrigger>
          <TabsTrigger value="batches" className="text-xs">Batches & Subjects</TabsTrigger>
          <TabsTrigger value="exams" className="text-xs">Exams ({data?.exams.length || 0})</TabsTrigger>
          <TabsTrigger value="fees" className="text-xs">Financial Ledger</TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & SUBSCRIPTION */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  General Profile & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{inst?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{inst?.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <span>{inst?.city}, {inst?.country}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>Onboarded: {inst?.created_at ? format(new Date(inst.created_at), 'MMM d, yyyy') : '-'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Capacity Progress Bars */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-purple-600" />
                  Quota Capacity & Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Students ({studentCount} / {inst?.student_limit})</span>
                    <span>{studentPct}%</span>
                  </div>
                  <Progress value={studentPct} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Teachers ({teacherCount} / {inst?.teacher_limit})</span>
                    <span>{teacherPct}%</span>
                  </div>
                  <Progress value={teacherPct} className="h-2" />
                </div>
                <div className="pt-2 border-t text-xs text-slate-500">
                  <span>Subscription MRR Contribution: <strong>₹{sub?.plan?.monthly_price?.toLocaleString() || 7999} / mo</strong></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: TEACHERS ROSTER */}
        <TabsContent value="teachers">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Registered Teachers Roster</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Teacher Name</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Qualification</TableHead>
                    <TableHead>Phone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.teachers || []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{t.employee_id}</TableCell>
                      <TableCell className="font-medium text-slate-900">{t.first_name} {t.last_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{t.specialization}</Badge></TableCell>
                      <TableCell className="text-xs text-slate-600">{t.qualification}</TableCell>
                      <TableCell className="text-xs text-slate-600">{t.phone}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STUDENTS DIRECTORY */}
        <TabsContent value="students">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Enrolled Students Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Linked Parent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.students || []).map((st) => (
                    <TableRow key={st.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{st.student_id}</TableCell>
                      <TableCell className="font-medium text-slate-900">{st.first_name} {st.last_name}</TableCell>
                      <TableCell className="text-xs text-slate-600">{st.admission_number}</TableCell>
                      <TableCell className="text-xs capitalize">{st.gender}</TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {st.parents?.[0] ? `${st.parents[0].first_name} ${st.parents[0].last_name} (${st.parents[0].phone})` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BATCHES & SUBJECTS */}
        <TabsContent value="batches" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.batches || []).map((b) => (
              <Card key={b.id} className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-900">{b.name}</CardTitle>
                  <CardDescription className="font-mono text-xs">{b.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Enrolled: <strong>{b.enrolledCount} / {b.capacity}</strong></span>
                    <span>Year: {b.academic_year}</span>
                  </div>
                  <Progress value={Math.round((b.enrolledCount / b.capacity) * 100)} className="h-1.5" />
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Academic Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Max Marks</TableHead>
                    <TableHead>Passing Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.subjects || []).map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{sub.code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{sub.name}</TableCell>
                      <TableCell className="text-xs">{sub.max_marks}</TableCell>
                      <TableCell className="text-xs text-green-700 font-semibold">{sub.passing_marks}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: EXAMS & ACADEMIC RECORDS */}
        <TabsContent value="exams">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Offline Examinations & Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Code</TableHead>
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Marks Entered</TableHead>
                    <TableHead>Pass Rate</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.exams || []).map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{ex.code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{ex.name}</TableCell>
                      <TableCell className="text-xs">{ex.academic_year}</TableCell>
                      <TableCell className="text-xs">{ex.totalEntries} entries</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-800 text-xs">{ex.passRate}% Pass</Badge></TableCell>
                      <TableCell><StatusBadge status={ex.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: FINANCIAL LEDGER & FEES */}
        <TabsContent value="fees" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Fee Assigned" value={`₹${(data?.feeSummary.totalAssigned || 0).toLocaleString()}`} icon={CreditCard} color="blue" />
            <StatCard title="Total Collected" value={`₹${(data?.feeSummary.totalCollected || 0).toLocaleString()}`} icon={CreditCard} color="green" />
            <StatCard title="Pending Balance" value={`₹${(data?.feeSummary.pending || 0).toLocaleString()}`} icon={CreditCard} color="amber" />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Fee Payments Ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.feeSummary.recentPayments || []).map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-700">{pay.receipt_number}</TableCell>
                      <TableCell className="font-bold text-green-700">₹{pay.amount_paid.toLocaleString()}</TableCell>
                      <TableCell className="text-xs capitalize">{pay.payment_method}</TableCell>
                      <TableCell className="text-xs text-slate-500">{pay.payment_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
