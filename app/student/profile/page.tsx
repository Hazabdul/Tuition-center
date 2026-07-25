'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { studentNav } from '@/lib/nav/student';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, GraduationCap, Hash } from 'lucide-react';
import { format } from 'date-fns';

interface StudentProfile {
  id: string;
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string | null;
  date_of_birth: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  address: string | null;
  admission_date: string;
  academic_year: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  is_active: boolean;
  batches?: Array<{ batch: { name: string; code: string } }>;
}

export default function StudentProfilePage() {
  const api = useApi();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<StudentProfile>({
    queryKey: ['student-profile'],
    queryFn: async () => {
      const res = await api.get<StudentProfile>('/api/v1/students/me');
      return res.data;
    },
  });

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'S';

  return (
    <DashboardLayout navSections={studentNav} role="student">
      <PageHeader title="My Profile" description="Your student profile information" />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Avatar Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-green-100 text-green-700 text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile?.first_name} {profile?.last_name}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Student</p>
              </div>
              <div className="flex flex-col gap-2 w-full">
                {profile?.student_id && (
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Student ID</span>
                    <Badge variant="outline">{profile.student_id}</Badge>
                  </div>
                )}
                {profile?.admission_number && (
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-xs text-slate-500">Admission No.</span>
                    <Badge variant="outline">{profile.admission_number}</Badge>
                  </div>
                )}
                <Badge className={profile?.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                  {profile?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label="Email" value={profile?.email || user?.email || '—'} />
                <InfoRow icon={Phone} label="Phone" value={profile?.phone || user?.phone || '—'} />
                <InfoRow icon={Calendar} label="Date of Birth" value={profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'dd MMM yyyy') : '—'} />
                <InfoRow icon={User} label="Gender" value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : '—'} />
                <InfoRow icon={Calendar} label="Admission Date" value={profile?.admission_date ? format(new Date(profile.admission_date), 'dd MMM yyyy') : '—'} />
                <InfoRow icon={GraduationCap} label="Academic Year" value={profile?.academic_year || '—'} />
                <InfoRow icon={Hash} label="Alt Phone" value={profile?.alt_phone || '—'} />
                <InfoRow icon={User} label="Address" value={profile?.address || '—'} />
              </div>

              {(profile?.emergency_contact_name || profile?.emergency_contact_phone) && (
                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Emergency Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow icon={User} label="Name" value={profile?.emergency_contact_name || '—'} />
                    <InfoRow icon={Phone} label="Phone" value={profile?.emergency_contact_phone || '—'} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch Card */}
          {profile?.batches && profile.batches.length > 0 && (
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  Enrolled Batches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.batches.map((sb, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{sb.batch.name}</span>
                      <Badge variant="outline" className="text-xs">{sb.batch.code}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-700">{value}</p>
      </div>
    </div>
  );
}
