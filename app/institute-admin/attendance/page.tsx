'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { instituteAdminNav } from '@/lib/nav/institute-admin';
import { PageHeader, StatCard, EmptyState, ErrorState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, CalendarClock, CheckCheck, Save, Loader2, Users, CalendarDays, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

interface BatchStudent {
  id: string;
  first_name: string;
  last_name: string | null;
  student_id: string;
}

interface BatchDetail {
  id: string;
  name: string;
  code: string;
  students?: BatchStudent[];
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  status: AttendanceStatus;
  remarks: string | null;
}

interface AttendanceHistoryRecord {
  id: string;
  student_id: string;
  status: AttendanceStatus;
}

interface AttendanceEntry {
  status: AttendanceStatus;
  remarks: string;
}

const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: string;
  inactive: string;
}> = [
  { value: 'present', label: 'Present', icon: CheckCircle2, active: 'bg-green-600 text-white border-green-600', inactive: 'text-green-700 hover:bg-green-50 border-slate-200' },
  { value: 'absent', label: 'Absent', icon: XCircle, active: 'bg-red-600 text-white border-red-600', inactive: 'text-red-700 hover:bg-red-50 border-slate-200' },
  { value: 'late', label: 'Late', icon: Clock, active: 'bg-amber-500 text-white border-amber-500', inactive: 'text-amber-700 hover:bg-amber-50 border-slate-200' },
  { value: 'leave', label: 'Leave', icon: CalendarClock, active: 'bg-blue-600 text-white border-blue-600', inactive: 'text-blue-700 hover:bg-blue-50 border-slate-200' },
];

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-amber-100 text-amber-700',
  leave: 'bg-blue-100 text-blue-700',
};

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function TakeAttendancePage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceEntry>>({});

  // Fetch batches for the dropdown
  const { data: batchesData, isLoading: batchesLoading } = useQuery<{ data: BatchOption[] }>({
    queryKey: ['batches-list-attendance'],
    queryFn: async () => {
      const res = await api.get<BatchOption[]>('/api/v1/batches?limit=100');
      return { data: res.data as BatchOption[] };
    },
  });

  // Fetch batch detail (students list) when a batch is selected
  const {
    data: batchDetail,
    isLoading: batchLoading,
    isError: batchError,
    refetch: refetchBatch,
  } = useQuery<BatchDetail, Error>({
    queryKey: ['batch-attendance', selectedBatch],
    queryFn: async () => {
      const res = await api.get<BatchDetail>(`/api/v1/batches/${selectedBatch}`);
      return res.data as BatchDetail;
    },
    enabled: !!selectedBatch,
  });

  // Fetch existing attendance for the batch + date
  const {
    data: existingAttendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
    refetch: refetchAttendance,
  } = useQuery<AttendanceRecord[], Error>({
    queryKey: ['attendance-existing', selectedBatch, selectedDate],
    queryFn: async () => {
      const res = await api.get<AttendanceRecord[]>(`/api/v1/attendance/batch/${selectedBatch}?date=${selectedDate}`);
      return res.data as AttendanceRecord[];
    },
    enabled: !!selectedBatch && !!selectedDate,
  });

  // Fetch attendance history for the batch (for percentage calculations)
  const { data: attendanceHistory } = useQuery<AttendanceHistoryRecord[], Error>({
    queryKey: ['attendance-history', selectedBatch],
    queryFn: async () => {
      const res = await api.get<AttendanceHistoryRecord[]>(`/api/v1/attendance/batch/${selectedBatch}?limit=1000`);
      return res.data as AttendanceHistoryRecord[];
    },
    enabled: !!selectedBatch,
  });

  const students = batchDetail?.students ?? [];

  // Initialize attendance records from existing attendance when data loads/changes
  useEffect(() => {
    if (!students.length) {
      setAttendanceRecords({});
      return;
    }
    const existingMap = new Map<string, AttendanceRecord>();
    (existingAttendance ?? []).forEach((r: AttendanceRecord) => existingMap.set(r.student_id, r));

    const next: Record<string, AttendanceEntry> = {};
    students.forEach((s: BatchStudent) => {
      const ex = existingMap.get(s.id);
      next[s.id] = {
        status: ex?.status ?? 'present',
        remarks: ex?.remarks ?? '',
      };
    });
    setAttendanceRecords(next);
  }, [students, existingAttendance]);

  // Compute attendance percentage per student from history
  const attendancePercent = useMemo(() => {
    const stats: Record<string, { present: number; total: number }> = {};
    (attendanceHistory ?? []).forEach((r: AttendanceHistoryRecord) => {
      if (!stats[r.student_id]) stats[r.student_id] = { present: 0, total: 0 };
      stats[r.student_id].total += 1;
      if (r.status === 'present' || r.status === 'late') stats[r.student_id].present += 1;
    });
    const out: Record<string, number> = {};
    Object.entries(stats).forEach(([sid, s]) => {
      out[sid] = s.total > 0 ? Math.round((s.present / s.total) * 100) : 0;
    });
    return out;
  }, [attendanceHistory]);

  // Summary of current selections
  const summary = useMemo(() => {
    const counts: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, leave: 0 };
    Object.values(attendanceRecords).forEach((r) => {
      counts[r.status] += 1;
    });
    return counts;
  }, [attendanceRecords]);

  const setStatus = (studentId: string, status: AttendanceStatus) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const setRemarks = (studentId: string, remarks: string) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const markAllPresent = () => {
    setAttendanceRecords((prev) => {
      const next: Record<string, AttendanceEntry> = {};
      students.forEach((s: BatchStudent) => {
        next[s.id] = { status: 'present', remarks: prev[s.id]?.remarks ?? '' };
      });
      return next;
    });
    toast({ title: 'All students marked present' });
  };

  const submitMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post('/api/v1/attendance/bulk', body),
    onSuccess: () => {
      toast({ title: 'Attendance saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['attendance-existing', selectedBatch, selectedDate] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history', selectedBatch] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  const handleSubmit = () => {
    if (!selectedBatch || !selectedDate) {
      toast({ title: 'Select a batch and date', variant: 'destructive' });
      return;
    }
    if (students.length === 0) {
      toast({ title: 'No students to mark attendance for', variant: 'destructive' });
      return;
    }
    const records = students.map((s: BatchStudent) => {
      const entry = attendanceRecords[s.id] ?? { status: 'present' as AttendanceStatus, remarks: '' };
      return {
        studentId: s.id,
        status: entry.status,
        remarks: entry.remarks,
      };
    });
    submitMutation.mutate({
      batchId: selectedBatch,
      date: selectedDate,
      records,
    });
  };

  const isLoadingDetail = batchLoading || attendanceLoading;
  const hasBatchError = batchError || attendanceError;

  return (
    <DashboardLayout navSections={instituteAdminNav} role="institute_admin">
      <PageHeader title="Take Attendance" description="Mark and manage student attendance for a batch" />

      {/* Selector card */}
      <Card className="border-slate-200 shadow-sm mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            Attendance Details
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await api.get<any[]>('/api/v1/attendance/deficits');
                const list = res.data || [];
                if (list.length === 0) {
                  toast({ title: 'No students below 75% attendance threshold!' });
                } else {
                  const target = list[0];
                  await api.post('/api/v1/attendance/deficits', {
                    studentId: target.studentId,
                    studentName: target.studentName,
                    percentage: target.percentage,
                  });
                  toast({ title: `Low attendance warning alert sent for ${target.studentName} (${target.percentage}%)!` });
                }
              } catch (e: any) {
                toast({ title: e.message || 'Error checking deficits', variant: 'destructive' });
              }
            }}
            className="border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Check Low Attendance Deficits (&lt;75%)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select
                value={selectedBatch}
                onValueChange={(v) => {
                  setSelectedBatch(v);
                  setAttendanceRecords({});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={batchesLoading ? 'Loading batches...' : 'Select a batch'} />
                </SelectTrigger>
                <SelectContent>
                  {(batchesData?.data ?? []).map((b: BatchOption) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input
                type="date"
                value={selectedDate}
                max={todayISO()}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setAttendanceRecords({});
                }}
              />
            </div>
            <div className="space-y-1.5 flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={markAllPresent}
                disabled={!selectedBatch || students.length === 0 || isLoadingDetail}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Present
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* No batch selected */}
      {!selectedBatch && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              title="Select a batch to begin"
              description="Choose a batch and date above to load the student list and mark attendance."
            />
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {selectedBatch && isLoadingDetail && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm">Loading students and attendance...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {selectedBatch && !isLoadingDetail && hasBatchError && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <ErrorState
              message="Failed to load attendance data. Please try again."
              onRetry={() => {
                refetchBatch();
                refetchAttendance();
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Loaded: no students */}
      {selectedBatch && !isLoadingDetail && !hasBatchError && students.length === 0 && (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16">
            <EmptyState
              title="No students enrolled"
              description="This batch has no students assigned. Add students to the batch to mark attendance."
            />
          </CardContent>
        </Card>
      )}

      {/* Loaded: student attendance list */}
      {selectedBatch && !isLoadingDetail && !hasBatchError && students.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Present" value={summary.present} icon={CheckCircle2} color="green" />
            <StatCard title="Absent" value={summary.absent} icon={XCircle} color="red" />
            <StatCard title="Late" value={summary.late} icon={Clock} color="amber" />
            <StatCard title="On Leave" value={summary.leave} icon={CalendarClock} color="blue" />
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-blue-500" />
                Students
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-normal">
                  {students.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Student</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Student ID</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Attendance %</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s: BatchStudent) => {
                      const entry = attendanceRecords[s.id] ?? { status: 'present' as AttendanceStatus, remarks: '' };
                      const pct = attendancePercent[s.id] ?? 0;
                      const pctColor = pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';
                      return (
                        <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600 flex-shrink-0">
                                {s.first_name?.[0]?.toUpperCase()}
                                {s.last_name?.[0]?.toUpperCase() ?? ''}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">
                                  {s.first_name} {s.last_name ?? ''}
                                </p>
                                <p className="text-xs text-slate-500 md:hidden">{s.student_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.student_id}</td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium ${pctColor}`}>{pct}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {STATUS_OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const isActive = entry.status === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setStatus(s.id, opt.value)}
                                    aria-pressed={isActive}
                                    title={opt.label}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                                      isActive ? opt.active : opt.inactive
                                    }`}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{opt.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <Input
                              value={entry.remarks}
                              onChange={(e) => setRemarks(s.id, e.target.value)}
                              placeholder="Optional remarks"
                              className="h-8 text-xs"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile remarks (shown below table since remarks column is hidden on small screens) */}
              <div className="md:hidden divide-y divide-slate-100 px-4 pb-4">
                {students.map((s: BatchStudent) => {
                  const entry = attendanceRecords[s.id] ?? { status: 'present' as AttendanceStatus, remarks: '' };
                  return (
                    <div key={`remarks-${s.id}`} className="py-3">
                      <p className="text-xs font-medium text-slate-500 mb-1">
                        Remarks — {s.first_name} {s.last_name ?? ''}
                      </p>
                      <Input
                        value={entry.remarks}
                        onChange={(e) => setRemarks(s.id, e.target.value)}
                        placeholder="Optional remarks"
                        className="h-8 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Submit bar */}
          <div className="sticky bottom-4 mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 shadow-md rounded-lg p-4">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Users className="h-4 w-4 text-slate-400" />
              <span>
                <span className="font-medium text-slate-900">{students.length}</span> students ·{' '}
                <span className="font-medium text-green-600">{summary.present}</span> present ·{' '}
                <span className="font-medium text-red-600">{summary.absent}</span> absent ·{' '}
                <span className="font-medium text-amber-600">{summary.late}</span> late ·{' '}
                <span className="font-medium text-blue-600">{summary.leave}</span> leave
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              className="sm:w-auto w-full"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
