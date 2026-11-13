import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, StatTile } from '../../components/ui';
import { Icon } from '../../components/Icon';
import api from '../../lib/api';
import { score, timeAgo } from '../../lib/format';
import { descriptor, SectionSummary } from '../../hooks/useStudent';

interface DashboardData {
  student: { firstName: string; name: string; lrn: string; photoUrl: string | null; idReady: boolean };
  section: SectionSummary | null;
  report: {
    subjectCount: number;
    quarterAverages: Record<number, number | null>;
    latestQuarter: number | null;
    latestAverage: number | null;
    generalAverage: number | null;
    passingScore: number;
    atRisk: string[];
  } | null;
  announcements: { id: string; title: string; body: string; createdAt: string; isPinned: boolean }[];
  unreadAnnouncements: number;
}

export default function StudentDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => api.get<DashboardData>('/student/dashboard').then((r) => r.data),
  });

  const r = data?.report;
  const quarters = [1, 2, 3, 4];
  const maxBar = 100;
  const minBar = 60;

  return (
    <DashboardLayout
      title={data ? `Hi, ${data.student.firstName}!` : 'Dashboard'}
      subtitle={data?.section ? `${data.section.name} · ${data.section.gradeLevel}${data.section.strand ? ` ${data.section.strand}` : ''} · Adviser: ${data.section.adviser ?? '—'}` : undefined}
    >
      {isLoading ? (
        <PageLoader rows={6} />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : data ? (
        <div className="space-y-6">
          {!data.section && <Alert tone="warn" title="You're not enrolled in a section yet">Please check with the registrar's office.</Alert>}
          {!data.student.idReady && (
            <Alert tone="info" title="Your school ID isn't ready" action={<Link to="/student/my-id" className="inline-flex h-8 items-center rounded-lg bg-gold-400 px-3 text-xs font-semibold text-ink hover:bg-gold-500">Upload now</Link>}>
              Upload your photo and signature so your ID can be printed.
            </Alert>
          )}

          {r && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatTile
                tone="brand"
                icon="chart"
                label={r.latestQuarter ? `Quarter ${r.latestQuarter} average` : 'Latest average'}
                value={score(r.latestAverage)}
                hint={r.latestAverage ? descriptor(Math.round(r.latestAverage)) : 'No grades released yet'}
              />
              <StatTile icon="graduation" label="General average" value={score(r.generalAverage)} hint={r.generalAverage ? descriptor(Math.round(r.generalAverage)) : 'Available after Quarter 4'} />
              <StatTile icon="book" label="Subjects" value={r.subjectCount} hint={data.section?.schoolYear ? `SY ${data.section.schoolYear}` : undefined} />
              <StatTile tone="gold" icon="megaphone" label="Unread announcements" value={data.unreadAnnouncements} />
            </div>
          )}

          <div className="grid lg:grid-cols-5 gap-6">
            {r && (
              <Card className="lg:col-span-3">
                <CardHeader title="Quarterly averages" description="Average of all released subject grades per quarter" actions={<Link to="/student/my-grades" className="text-xs font-semibold text-brand-800 hover:underline">View grades →</Link>} />
                <div className="flex items-end gap-4 h-48 pt-4">
                  {quarters.map((q) => {
                    const v = r.quarterAverages[q];
                    const h = v ? ((v - minBar) / (maxBar - minBar)) * 100 : 0;
                    return (
                      <div key={q} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                        <span className="text-sm font-bold tabular-nums">{score(v)}</span>
                        <div className="w-full max-w-[72px] flex-1 flex items-end rounded-t-lg bg-ink/[0.04]">
                          <div className={v ? (v < r.passingScore ? 'w-full rounded-t-lg bg-danger-600' : 'w-full rounded-t-lg bg-brand-800') : ''} style={{ height: `${Math.max(h, v ? 6 : 0)}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-muted">Q{q}</span>
                      </div>
                    );
                  })}
                </div>
                {r.atRisk.length > 0 && (
                  <div className="mt-4">
                    <Alert tone="warn">
                      Your running average is below {r.passingScore} in <b>{r.atRisk.join(', ')}</b>. Talk to your subject teacher or adviser.
                    </Alert>
                  </div>
                )}
              </Card>
            )}

            <Card className={r ? 'lg:col-span-2' : 'lg:col-span-5'}>
              <CardHeader title="Announcements" actions={<Link to="/student/announcements" className="text-xs font-semibold text-brand-800 hover:underline">All →</Link>} />
              {data.announcements.length === 0 ? (
                <EmptyState icon="megaphone" title="Nothing new" />
              ) : (
                <ul className="space-y-4">
                  {data.announcements.map((a) => (
                    <li key={a.id}>
                      <div className="flex items-center gap-2">
                        {a.isPinned && <Badge tone="gold" icon="pin">Pinned</Badge>}
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

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { to: '/student/my-grades', icon: 'chart' as const, label: 'My grades', hint: 'Quarterly and final grades' },
              { to: '/student/report-card', icon: 'printer' as const, label: 'Report card', hint: 'Print your Form 138' },
              { to: '/student/my-id', icon: 'idcard' as const, label: 'My ID', hint: data.student.idReady ? 'Ready for printing' : 'Upload photo & signature' },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-brand-200">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                  <Icon name={l.icon} size={18} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold group-hover:text-brand-800">{l.label}</span>
                  <span className="block text-xs text-muted">{l.hint}</span>
                </span>
                <Icon name="chevronRight" size={16} className="text-muted" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
