import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, Progress, StatTile } from '../../components/ui';
import { Icon, IconName } from '../../components/Icon';
import api from '../../lib/api';
import { plural, timeAgo } from '../../lib/format';

interface Stats {
  schoolYear: { id: string; label: string } | null;
  quarter: number;
  students: { enrolled: number; juniorHigh: number; seniorHigh: number; unassigned: number; total: number };
  teachers: { total: number; teaching: number; withoutLoad: number };
  sections: { total: number; withoutAdviser: number; withoutSubjects: number };
  subjects: { total: number };
  idCards: { ready: number; total: number };
  pendingUnlockRequests: number;
  byGrade: { grade: string; name: string; isSeniorHigh: boolean; students: number; sections: number; encoded: number; locked: number; needed: number }[];
  recentActivity: { id: string; actor: string; role: string; action: string; description: string; createdAt: string }[];
}

const ACTION_TONE: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  LOCK: 'success',
  UNLOCK: 'warn',
  REQUEST_UNLOCK: 'warn',
  REJECT_UNLOCK: 'danger',
  DELETE: 'danger',
  CREATE: 'info',
  ENCODE: 'info',
};

export default function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<Stats>('/admin/dashboard/stats').then((r) => r.data),
  });

  const attention: { icon: IconName; text: string; to: string; cta: string }[] = [];
  if (data?.schoolYear) {
    if (data.pendingUnlockRequests) attention.push({ icon: 'unlock', text: `${plural(data.pendingUnlockRequests, 'unlock request')} waiting for review`, to: '/admin/grade-locks?tab=requests', cta: 'Review' });
    if (data.students.unassigned) attention.push({ icon: 'graduation', text: `${plural(data.students.unassigned, 'active student')} not enrolled in a section`, to: '/admin/students?filter=unassigned', cta: 'Assign' });
    if (data.sections.withoutAdviser) attention.push({ icon: 'user', text: `${plural(data.sections.withoutAdviser, 'section')} without an adviser`, to: '/admin/sections', cta: 'Fix' });
    if (data.sections.withoutSubjects) attention.push({ icon: 'link', text: `${plural(data.sections.withoutSubjects, 'section')} with no subjects assigned`, to: '/admin/teaching-assignments', cta: 'Assign' });
    if (data.teachers.withoutLoad) attention.push({ icon: 'layers', text: `${plural(data.teachers.withoutLoad, 'teacher')} without a teaching load`, to: '/admin/teaching-assignments', cta: 'View' });
  }

  const totals = data?.byGrade.reduce((a, g) => ({ locked: a.locked + g.locked, needed: a.needed + g.needed }), { locked: 0, needed: 0 });

  return (
    <DashboardLayout title="Registrar dashboard" subtitle={data?.schoolYear ? `School year ${data.schoolYear.label} · Quarter ${data.quarter}` : 'Overview'}>
      {isLoading ? (
        <PageLoader rows={6} />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : !data?.schoolYear ? (
        <Card>
          <EmptyState icon="calendar" title="No school year yet" description="Create a school year to start setting up sections and classes." action={<Link className="text-brand-800 font-semibold" to="/admin/school-years">Go to school years →</Link>} />
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatTile tone="brand" icon="graduation" label="Enrolled students" value={data.students.enrolled.toLocaleString()} hint={`${data.students.juniorHigh} JHS · ${data.students.seniorHigh} SHS`} />
            <StatTile icon="user" label="Teachers with a load" value={`${data.teachers.teaching}/${data.teachers.total}`} hint={`${data.sections.total} sections · ${data.subjects.total} subjects`} />
            <StatTile icon="lock" label={`Q${data.quarter} grades submitted`} value={`${totals && totals.needed ? Math.round((totals.locked / totals.needed) * 100) : 0}%`} hint={`${totals?.locked.toLocaleString()} of ${totals?.needed.toLocaleString()} grades locked`}>
              <Progress value={totals?.locked ?? 0} max={totals?.needed ?? 0} tone="success" />
            </StatTile>
            <StatTile tone="gold" icon="idcard" label="ID cards ready" value={`${data.idCards.ready}/${data.idCards.total}`} hint="Photo and signature uploaded" />
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader title={`Quarter ${data.quarter} submission by grade level`} description="Share of grades encoded and locked by teachers" actions={<Link to="/admin/grade-locks" className="text-xs font-semibold text-brand-800 hover:underline">All sheets →</Link>} />
              <div className="space-y-4">
                {data.byGrade.map((g) => (
                  <div key={g.grade}>
                    <div className="flex items-baseline justify-between text-sm mb-1.5">
                      <span className="font-semibold">
                        {g.name} <span className="text-xs font-normal text-muted">· {plural(g.sections, 'section')} · {plural(g.students, 'student')}</span>
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {g.needed ? Math.round((g.locked / g.needed) * 100) : 0}% locked
                      </span>
                    </div>
                    <div className="relative h-2 rounded-full bg-ink/5 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gold-200" style={{ width: `${g.needed ? (g.encoded / g.needed) * 100 : 0}%` }} />
                      <div className="absolute inset-y-0 left-0 bg-brand-800" style={{ width: `${g.needed ? (g.locked / g.needed) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 pt-1 text-xs text-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-800" /> Locked</span>
                  <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold-200" /> Encoded, not yet locked</span>
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Needs attention" />
              {attention.length === 0 ? (
                <EmptyState icon="checkCircle" title="All caught up" description="Nothing needs your action right now." />
              ) : (
                <ul className="divide-y divide-line -my-2">
                  {attention.map((a) => (
                    <li key={a.text} className="flex items-center gap-3 py-3">
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warn-50 text-warn-700">
                        <Icon name={a.icon} size={16} />
                      </span>
                      <p className="flex-1 text-sm">{a.text}</p>
                      <Link to={a.to} className="text-xs font-semibold text-brand-800 hover:underline">
                        {a.cta} →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <CardHeader title="Recent activity" actions={<Link to="/admin/audit-log" className="text-xs font-semibold text-brand-800 hover:underline">Audit log →</Link>} />
            {data.recentActivity.length === 0 ? (
              <EmptyState icon="history" title="No activity yet" />
            ) : (
              <ul className="divide-y divide-line -my-2">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                    <Badge tone={ACTION_TONE[a.action] ?? 'neutral'}>{a.action.replace(/_/g, ' ').toLowerCase()}</Badge>
                    <p className="flex-1 min-w-[200px] text-sm">
                      <span className="font-semibold">{a.actor}</span> <span className="text-ink-soft">{a.description}</span>
                    </p>
                    <span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
