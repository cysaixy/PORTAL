import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, Progress, SheetStatus, StatTile } from '../../components/ui';
import { Icon } from '../../components/Icon';
import api from '../../lib/api';
import { plural, timeAgo } from '../../lib/format';

interface DashboardData {
  teacher: { firstName: string; lastName: string; department: string | null };
  quarter: number;
  stats: { classes: number; students: number; sheetsLocked: number; sheetsPending: number; pendingRequests: number };
  advisory: { id: string; name: string; studentCount: number } | null;
  sheets: { id: string; section: string; subject: string; subjectTitle: string; total: number; encoded: number; locked: number; pendingUnlock: boolean; status: string }[];
  announcements: { id: string; title: string; body: string; createdAt: string; isPinned: boolean }[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export default function TeacherDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher', 'dashboard'],
    queryFn: () => api.get<DashboardData>('/teacher/dashboard').then((r) => r.data),
  });

  const todo = data?.sheets.filter((s) => s.status !== 'Locked') ?? [];

  return (
    <DashboardLayout
      title={data ? `${greeting()}, ${data.teacher.firstName}` : 'Dashboard'}
      subtitle={data ? `${data.teacher.department ?? 'Faculty'} · Quarter ${data.quarter} grading period` : undefined}
    >
      {isLoading ? (
        <PageLoader rows={6} />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatTile tone="brand" icon="layers" label="Classes" value={data.stats.classes} hint={plural(data.stats.students, 'student')} />
            <StatTile icon="lock" label={`Q${data.quarter} sheets submitted`} value={`${data.stats.sheetsLocked}/${data.stats.classes}`}>
              <Progress value={data.stats.sheetsLocked} max={data.stats.classes} tone="success" />
            </StatTile>
            <StatTile icon="pencil" label="Sheets to finish" value={data.stats.sheetsPending} hint={data.stats.sheetsPending ? 'Encode and submit before the deadline' : 'All done for this quarter'} />
            <StatTile tone="gold" icon="users" label="Advisory class" value={data.advisory?.name ?? '—'} hint={data.advisory ? plural(data.advisory.studentCount, 'student') : 'Not an adviser this year'} />
          </div>

          {data.stats.pendingRequests > 0 && (
            <Alert tone="info" title="Unlock request pending">
              You have {plural(data.stats.pendingRequests, 'unlock request')} waiting for the registrar.
            </Alert>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader
                title={`Quarter ${data.quarter} grade sheets`}
                description={todo.length ? `${plural(todo.length, 'sheet')} still open` : 'Every sheet is submitted'}
                actions={<Link to="/teacher/my-sections" className="text-xs font-semibold text-brand-800 hover:underline">All classes →</Link>}
              />
              {data.sheets.length === 0 ? (
                <EmptyState icon="layers" title="No classes assigned" description="The registrar hasn't assigned you any classes this school year." />
              ) : (
                <ul className="divide-y divide-line -my-2">
                  {data.sheets.map((s) => (
                    <li key={s.id}>
                      <Link to={`/teacher/encode-grades?class=${s.id}&q=${data.quarter}`} className="flex items-center gap-4 py-3 group">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold group-hover:text-brand-800">
                            {s.subject} <span className="font-normal text-muted">· {s.section}</span>
                          </p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Progress value={s.encoded} max={s.total} tone={s.status === 'Locked' ? 'success' : 'brand'} className="w-28" />
                            <span className="text-xs text-muted tabular-nums">{s.encoded}/{s.total} encoded</span>
                          </div>
                        </div>
                        {s.pendingUnlock && <Badge tone="warn" icon="unlock">Unlock requested</Badge>}
                        <SheetStatus status={s.status} />
                        <Icon name="chevronRight" size={16} className="text-muted group-hover:text-brand-800" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="From the registrar" actions={<Link to="/teacher/announcements" className="text-xs font-semibold text-brand-800 hover:underline">All →</Link>} />
              {data.announcements.length === 0 ? (
                <EmptyState icon="megaphone" title="No announcements" />
              ) : (
                <ul className="space-y-4">
                  {data.announcements.map((a) => (
                    <li key={a.id}>
                      <div className="flex items-center gap-2">
                        {a.isPinned && <Icon name="pin" size={14} className="text-gold-700" />}
                        <p className="font-semibold text-sm">{a.title}</p>
                      </div>
                      <p className="text-xs text-ink-soft line-clamp-2 mt-0.5">{a.body}</p>
                      <p className="text-[11px] text-muted mt-1">{timeAgo(a.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
