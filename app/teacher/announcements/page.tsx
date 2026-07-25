'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Megaphone, Send, BookOpen, GraduationCap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface BatchOption {
  id: string;
  name: string;
  code: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
}

export default function TeacherAnnouncementsPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBatch, setSelectedBatch] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');

  const { data: batchesData } = useQuery<{ data: BatchOption[] }>({
    queryKey: ['teacher-batches-announcements'],
    queryFn: async () => {
      const res = await api.get<BatchOption[]>('/api/v1/batches?limit=100');
      return { data: res.data as BatchOption[] };
    },
  });

  const { data: announcements, isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['teacher-announcements'],
    queryFn: async () => {
      const res = await api.get<AnnouncementItem[]>('/api/v1/teacher/announcements');
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: { batchId: string; title: string; message: string; type: string }) =>
      api.post('/api/v1/teacher/announcements', body),
    onSuccess: (res) => {
      toast({ title: res.message || 'Classroom announcement broadcasted to students!' });
      setTitle('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['teacher-announcements'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !message) return;
    createMutation.mutate({ batchId: selectedBatch, title, message, type });
  }

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader
        title="Classroom Announcements"
        description="Broadcast homework reminders, assignment notices, and exam alerts to your students"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Post Class Notice Form */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <span>Post Student Announcement</span>
            </CardTitle>
            <CardDescription>Send instant noticeboard alerts to enrolled students</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="batch" className="text-xs font-medium">Select Target Batch *</Label>
                <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                  <SelectTrigger id="batch">
                    <SelectValue placeholder="Select Batch Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {(batchesData?.data || []).map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-medium">Notice Category</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">General Classroom Notice</SelectItem>
                    <SelectItem value="warning">Homework & Assignment Reminder</SelectItem>
                    <SelectItem value="urgent">Exam & Quiz Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">Notice Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Physics Lab Manual Due Friday"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-medium">Announcement Message *</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write clear instructions for students..."
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Broadcasting...' : 'Post to Class Noticeboard'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History of Published Notices */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Classroom Notices</CardTitle>
            <CardDescription>History of notices sent to your batches</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-slate-50 rounded animate-pulse" />
            ) : (announcements || []).length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Megaphone className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p>No classroom notices published yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Notice Content</TableHead>
                    <TableHead>Date Sent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(announcements || []).map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <StatusBadge status={item.type || 'info'} />
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-xs text-slate-600 line-clamp-2 mt-0.5">{item.message}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                        {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
