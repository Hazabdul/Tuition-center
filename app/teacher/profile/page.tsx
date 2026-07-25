'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader, StatCard } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, BookOpen, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';

interface TeacherProfile {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  qualification: string | null;
  specialization: string | null;
  joining_date: string;
  address: string | null;
  profile_photo_url: string | null;
  notes: string | null;
  is_active: boolean;
  batches?: Array<{ batch: { name: string; code: string } }>;
  subjects?: Array<{ subject: { name: string; code: string } }>;
}

export default function TeacherProfilePage() {
  const api = useApi();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<TeacherProfile>({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      const res = await api.get<TeacherProfile>('/api/v1/teachers/me');
      return res.data;
    },
  });

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'T';

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="My Profile" description="Your teacher profile information" />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Card */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user?.firstName} {user?.lastName}</h2>
                <p className="text-sm text-slate-500">Teacher</p>
                {profile?.employee_id && (
                  <Badge variant="outline" className="mt-2 text-xs">{profile.employee_id}</Badge>
                )}
              </div>
              <Badge className={profile?.is_active ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
                {profile?.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Contact & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label="Email" value={profile?.email || user?.email || '—'} />
                <InfoRow icon={Phone} label="Phone" value={profile?.phone || user?.phone || '—'} />
                <InfoRow icon={GraduationCap} label="Qualification" value={profile?.qualification || '—'} />
                <InfoRow icon={BookOpen} label="Specialization" value={profile?.specialization || '—'} />
                <InfoRow icon={User} label="Joining Date" value={profile?.joining_date ? format(new Date(profile.joining_date), 'dd MMM yyyy') : '—'} />
                <InfoRow icon={User} label="Address" value={profile?.address || '—'} />
              </div>
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
                Assigned Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!profile?.batches || profile.batches.length === 0 ? (
                <p className="text-sm text-slate-500">No batches assigned</p>
              ) : (
                <div className="space-y-2">
                  {profile.batches.map((tb: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{tb.batch.name}</span>
                      <Badge variant="outline" className="text-xs">{tb.batch.code}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-green-600" />
                Assigned Subjects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!profile?.subjects || profile.subjects.length === 0 ? (
                <p className="text-sm text-slate-500">No subjects assigned</p>
              ) : (
                <div className="space-y-2">
                  {profile.subjects.map((ts: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700">{ts.subject.name}</span>
                      <Badge variant="outline" className="text-xs">{ts.subject.code}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
