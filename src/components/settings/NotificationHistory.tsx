'use client';

import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/shadcn/card';
import { Badge } from '@/components/ui/shadcn/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/shadcn/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/shadcn/table';
import { Skeleton } from '@/components/ui/shadcn/skeleton';
import {
  RefreshCw,
  Mail,
  MessageSquare,
  Smartphone,
  Hash,
  Webhook,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';

type Notification = {
  id: string;
  channel: string;
  status: string;
  message: string | null;
  incident: {
    id: string;
    title: string;
    status: string;
    urgency: string;
  } | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  errorMsg: string | null;
  createdAt: string;
};

export default function NotificationHistory() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    pending: 0,
    failed: 0,
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (filterChannel && filterChannel !== 'all') params.set('channel', filterChannel);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);

      const response = await fetch(`/api/notifications/history?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);

        const allNotifications = data.notifications || [];
        const statsData = {
          total: data.total || 0,
          sent: allNotifications.filter((n: Notification) => n.status === 'SENT').length,
          pending: allNotifications.filter((n: Notification) => n.status === 'PENDING').length,
          failed: allNotifications.filter((n: Notification) => n.status === 'FAILED').length,
        };
        setStats(statsData);
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error fetching notification history', { error: error.message });
      } else {
        logger.error('Error fetching notification history', { error: String(error) });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, filterChannel, filterStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge variant="success" size="xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" size="xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="danger" size="xs">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" size="xs">
            {status}
          </Badge>
        );
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'SMS':
        return <MessageSquare className="h-4 w-4" />;
      case 'PUSH':
        return <Smartphone className="h-4 w-4" />;
      case 'SLACK':
        return <Hash className="h-4 w-4" />;
      case 'WEBHOOK':
        return <Webhook className="h-4 w-4" />;
      case 'WHATSAPP':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All recent notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Delivered successfully</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Queued or processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Delivery errors</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Notification History</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select
                value={filterChannel}
                onValueChange={v => {
                  setFilterChannel(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="PUSH">Push</SelectItem>
                  <SelectItem value="SLACK">Slack</SelectItem>
                  <SelectItem value="WEBHOOK">Webhook</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filterStatus}
                onValueChange={v => {
                  setFilterStatus(v);
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNotifications()}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Total: {total} notifications</p>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1">No notifications found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting the filters or refresh the list.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Incident</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map(notification => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getChannelIcon(notification.channel)}
                            <span className="font-medium">{notification.channel}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(notification.status)}</TableCell>
                        <TableCell>
                          {notification.incident ? (
                            <a
                              className="text-primary hover:underline font-medium"
                              href={`/incidents/${notification.incident.id}`}
                            >
                              {notification.incident.title}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {notification.createdAt}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {notification.sentAt || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {notification.errorMsg || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setOffset(offset + limit)}
                    disabled={offset + limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
