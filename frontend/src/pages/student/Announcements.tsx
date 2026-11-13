import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Button, Card, EmptyState, ErrorState, PageLoader, Segmented } from '../../components/ui';
import { useApiMutation } from '../../hooks/useReference';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Announcement } from '../../types';

export default function StudentAnnouncements() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'announcements'],
    queryFn: () => api.get<{ announcements: Announcement[]; unreadCount: number }>('/student/announcements').then((r) => r.data),
  });
  const markRead = useApiMutation((id: string) => api.post(`/student/announcements/${id}/read`), { invalidate: [['student']] });
  const markAll = useApiMutation(() => api.post('/student/announcements/read-all'), { success: 'All caught up', invalidate: [['student']] });

  const items = (data?.announcements ?? []).filter((a) => filter === 'all' || !a.isRead);

  const toggle = (a: Announcement) => {
    setOpen(open === a.id ? null : a.id);
    if (!a.isRead) markRead.mutate(a.id);
  };

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Updates from the registrar, your adviser and your teachers."
      actions={data?.unreadCount ? <Button icon="check" onClick={() => markAll.mutate(undefined)} loading={markAll.isPending}>Mark all as read</Button> : undefined}
    >
      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: data?.announcements.length },
            { value: 'unread', label: 'Unread', count: data?.unreadCount },
          ]}
        />
      </div>

      {isLoading ? (
        <Card><PageLoader /></Card>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : items.length === 0 ? (
        <Card><EmptyState icon="checkCircle" title={filter === 'unread' ? "You're all caught up" : 'No announcements yet'} /></Card>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => {
            const expanded = open === a.id;
            return (
              <li key={a.id}>
                <button
                  onClick={() => toggle(a)}
                  aria-expanded={expanded}
                  className={clsx(
                    'w-full text-left rounded-2xl border bg-white p-5 shadow-card transition-colors hover:border-brand-200',
                    a.isPinned ? 'border-gold-200' : 'border-line'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className={clsx('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.isRead ? 'bg-transparent' : 'bg-brand-500')} aria-label={a.isRead ? undefined : 'Unread'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {a.isPinned && <Badge tone="gold" icon="pin">Pinned</Badge>}
                        <Badge tone="info">{a.targetLabel}</Badge>
                        <span className="text-xs text-muted">{a.authorName} · {formatDateTime(a.createdAt)}</span>
                      </div>
                      <h3 className={clsx('text-ink', a.isRead ? 'font-semibold' : 'font-bold')}>{a.title}</h3>
                      <p className={clsx('mt-1 text-sm text-ink-soft whitespace-pre-line', !expanded && 'line-clamp-2')}>{a.body}</p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardLayout>
  );
}
