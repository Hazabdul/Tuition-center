'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { superAdminNav } from '@/lib/nav/super-admin';
import { PageHeader, StatusBadge } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Megaphone, Plus, Send, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  created_at: string;
}

export default function AnnouncementsPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetRole, setTargetRole] = useState('all');
  const [type, setType] = useState<'info' | 'warning' | 'success'>('info');

  const { data: announcements, isLoading } = useQuery<AnnouncementItem[]>({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<AnnouncementItem[]>('/api/v1/announcements');
      return res.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; message: string; targetRole: string; type: string }) =>
      api.post('/api/v1/announcements', body),
    onSuccess: () => {
      toast({ title: 'Announcement broadcasted successfully!' });
      setTitle('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: 'destructive' }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !message) return;
    createMutation.mutate({ title, message, targetRole, type });
  }

  return (
    <DashboardLayout navSections={superAdminNav} role="super_admin">
      <PageHeader
        title="Global Broadcasts & Announcements"
        description="Post platform-wide maintenance alerts and announcements to all users"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create Broadcast Form */}
        <Card className="lg:col-span-1 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-blue-600" />
              <span>Create Announcement</span>
            </CardTitle>
            <CardDescription>Broadcast a banner notification across all user portals</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">Broadcast Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Scheduled System Upgrade"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="targetRole" className="text-xs font-medium">Target Audience</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger id="targetRole">
                    <SelectValue placeholder="Select Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platform Users</SelectItem>
                    <SelectItem value="institute_admin">Institute Admins Only</SelectItem>
                    <SelectItem value="teacher">Teachers Only</SelectItem>
                    <SelectItem value="parent">Parents Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-medium">Alert Level</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Alert Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information (Blue)</SelectItem>
                    <SelectItem value="warning">Warning / Maintenance (Amber)</SelectItem>
                    <SelectItem value="success">Feature Update (Green)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-medium">Broadcast Message *</Label>
                <Textarea
                  id="message"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write message content..."
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending}>
                <Send className="h-4 w-4 mr-2" />
                {createMutation.isPending ? 'Broadcasting...' : 'Broadcast Announcement'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Broadcasts List */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Active Broadcast History</CardTitle>
            <CardDescription>Recently published platform announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-48 bg-slate-50 rounded animate-pulse" />
            ) : (announcements || []).length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Megaphone className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                <p>No announcements published yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title & Message</TableHead>
                    <TableHead>Date Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(announcements || []).map((item) => (
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
