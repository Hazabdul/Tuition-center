'use client';

import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { parentNav } from '@/lib/nav/parent';
import { PageHeader } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Briefcase, Users } from 'lucide-react';

interface ParentProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  relation_to_student: string | null;
  is_active: boolean;
  children?: Array<{ student: { id: string; first_name: string; last_name: string | null; student_id: string } }>;
}

export default function ParentProfilePage() {
  const api = useApi();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery<ParentProfile>({
    queryKey: ['parent-profile'],
    queryFn: async () => {
      const res = await api.get<ParentProfile>('/api/v1/parents/me');
      return res.data;
    },
  });

  const initials = user ? `${user.firstName.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase() : 'P';

  return (
    <DashboardLayout navSections={parentNav} role="parent">
      <PageHeader title="My Profile" description="Your parent profile information" />

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
                <AvatarFallback className="bg-purple-100 text-purple-700 text-2xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{profile?.first_name || user?.firstName} {profile?.last_name || user?.lastName}</h2>
                <p className="text-sm text-slate-500 mt-0.5">Parent / Guardian</p>
              </div>
              <Badge className={profile?.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                {profile?.is_active !== false ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Personal & Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={Mail} label="Email" value={profile?.email || user?.email || '—'} />
                <InfoRow icon={Phone} label="Phone" value={profile?.phone || user?.phone || '—'} />
                <InfoRow icon={Briefcase} label="Occupation" value={profile?.occupation || '—'} />
                <InfoRow icon={User} label="Relation to Student" value={profile?.relation_to_student || 'Parent'} />
                <InfoRow icon={User} label="Address" value={profile?.address || '—'} />
              </div>
            </CardContent>
          </Card>

          {/* Linked Children */}
          {profile?.children && profile.children.length > 0 && (
            <Card className="border-slate-200 shadow-sm lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Linked Children ({profile.children.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {profile.children.map((c) => (
                    <div key={c.student.id} className="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{c.student.first_name} {c.student.last_name}</p>
                        <p className="text-xs text-slate-500">{c.student.student_id}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">Student</Badge>
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
