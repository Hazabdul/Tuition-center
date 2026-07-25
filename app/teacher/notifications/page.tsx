'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api-client';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { teacherNav } from '@/lib/nav/teacher';
import { PageHeader } from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

function getIcon(type: string) {
  if (type === 'warning') return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  if (type === 'success') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  return <Info className="h-5 w-5 text-blue-500" />;
}

export default function TeacherNotificationsPage() {
  const api = useApi();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-notifications'],
    queryFn: async () => {
      const res = await api.get<NotificationItem[]>('/api/v1/notifications?limit=50');
      return res.data || [];
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.patch('/api/v1/notifications'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-notifications'] });
      toast({ title: 'Marked as read', description: 'All notifications marked as read.' });
    },
  });

  const unreadCount = (data || []).filter((n: any) => !n.is_read).length;

  return (
    <DashboardLayout navSections={teacherNav} role="teacher">
      <PageHeader title="Notifications" description="Your recent notifications">
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllRead.mutate()} className="flex items-center gap-2">
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((notification: any) => (
            <Card
              key={notification.id}
              className={`border-slate-200 shadow-sm transition-colors ${!notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!notification.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(notification.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
