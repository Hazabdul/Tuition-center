'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatusBadge, StatCard, EmptyState } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Pencil, Users, GraduationCap, BookOpen, Calendar, Clock, FileText } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import type { Batch, Student, Teacher, Subject } from '@/lib/types';

interface BatchDetail extends Batch {
  students?: Student[];
  teachers?: Teacher[];
  subjects?: Subject[];
}

type TabKey = 'students' | 'teachers' | 'subjects';

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const api = useApi();
  const [activeTab, setActiveTab] = useState<TabKey>('students');

  const { data: batch, isLoading } = useQuery<BatchDetail, Error>({
    queryKey: ['batch', params.id],
    queryFn: async () => {
      const res = await api.get<BatchDetail>(`/api/v1/batches/${params.id}`);
      return res.data;
    },
  });

  if (isLoading || !batch) {
    return (
      <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
        <div className="space-y-6">
          <div className="h-9 w-32 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; count: number; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'students', label: 'Students', count: batch.students?.length || 0, icon: GraduationCap },
    { key: 'teachers', label: 'Teachers', count: batch.teachers?.length || 0, icon: Users },
    { key: 'subjects', label: 'Subjects', count: batch.subjects?.length || 0, icon: BookOpen },
  ];

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <Button variant="ghost" size="sm" onClick={() => router.push('/institute-admin/batches')} className="mb-4 -ml-2 text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Batches
      </Button>

      <PageHeader title={batch.name} description={`Code: ${batch.code} · ${batch.academicYear || 'N/A'}`}>
        <Button onClick={() => router.push(`/institute-admin/batches/${batch.id}/edit`)}>
          <Pencil className="h-4 w-4 mr-2" /> Edit Batch
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Students" value={batch.students?.length || 0} icon={GraduationCap} color="blue" />
        <StatCard title="Teachers" value={batch.teachers?.length || 0} icon={Users} color="green" />
        <StatCard title="Subjects" value={batch.subjects?.length || 0} icon={BookOpen} color="purple" />
        <StatCard title="Capacity" value={batch.capacity} icon={Users} color="amber" />
      </div>

      {/* Batch Info */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Batch Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoRow icon={Calendar} label="Start Date" value={batch.startDate ? formatDate(batch.startDate) : null} />
            <InfoRow icon={Calendar} label="End Date" value={batch.endDate ? formatDate(batch.endDate) : null} />
            <InfoRow icon={Clock} label="Timing" value={batch.startTime && batch.endTime ? `${batch.startTime} - ${batch.endTime}` : null} />
            <InfoRow icon={Users} label="Capacity" value={String(batch.capacity)} />
            <div className="sm:col-span-2 lg:col-span-3">
              <InfoRow icon={FileText} label="Description" value={batch.description} />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <StatusBadge status={batch.isActive ? 'active' : 'inactive'} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-0">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {activeTab === 'students' && (
            (!batch.students || batch.students.length === 0) ? (
              <EmptyState title="No students enrolled" description="No students are assigned to this batch yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Student ID</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Contact</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.students.map((student: Student) => (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{student.firstName} {student.lastName}</td>
                        <td className="px-4 py-3 text-slate-500">{student.studentId}</td>
                        <td className="px-4 py-3 text-slate-500">{student.email || student.phone || '-'}</td>
                        <td className="px-4 py-3"><StatusBadge status={student.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/students/${student.id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'teachers' && (
            (!batch.teachers || batch.teachers.length === 0) ? (
              <EmptyState title="No teachers assigned" description="No teachers are assigned to this batch yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Teacher</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Employee ID</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Specialization</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-medium text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.teachers.map((teacher: Teacher) => (
                      <tr key={teacher.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{teacher.firstName} {teacher.lastName}</td>
                        <td className="px-4 py-3 text-slate-500">{teacher.employeeId}</td>
                        <td className="px-4 py-3 text-slate-500">{teacher.specialization || '-'}</td>
                        <td className="px-4 py-3"><StatusBadge status={teacher.isActive ? 'active' : 'inactive'} /></td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/institute-admin/teachers/${teacher.id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'subjects' && (
            (!batch.subjects || batch.subjects.length === 0) ? (
              <EmptyState title="No subjects assigned" description="No subjects are assigned to this batch yet." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {batch.subjects.map((subject: Subject) => (
                  <div key={subject.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                        <p className="text-xs text-slate-500">{subject.code}</p>
                      </div>
                      <StatusBadge status={subject.isActive ? 'active' : 'inactive'} />
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      <span>Max: {subject.maxMarks}</span> · <span>Pass: {subject.passingMarks}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 mt-0.5 break-words">{value || '—'}</p>
      </div>
    </div>
  );
}
