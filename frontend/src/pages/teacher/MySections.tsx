import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Card, EmptyState, ErrorState, PageLoader } from '../../components/ui';
import { Icon } from '../../components/Icon';
import api from '../../lib/api';
import { plural } from '../../lib/format';

export interface TeacherClass {
  id: string;
  subject: { id: string; code: string; title: string; category: string };
  section: { id: string; name: string; gradeLevel: string; strand: string | null; studentCount: number };
  quarters: Record<number, { total: number; encoded: number; locked: number; pendingUnlock: boolean; status: string }>;
}

export const useTeacherClasses = () =>
  useQuery({
    queryKey: ['teacher', 'classes'],
    queryFn: () => api.get<{ currentQuarter: number; classes: TeacherClass[] }>('/teacher/classes').then((r) => r.data),
  });

const DOT: Record<string, string> = {
  Locked: 'bg-success-600 text-white',
  Complete: 'bg-info-600 text-white',
  'In progress': 'bg-gold-400 text-ink',
  'Not started': 'bg-ink/10 text-muted',
};

export default function MySections() {
  const { data, isLoading, error, refetch } = useTeacherClasses();

  return (
    <DashboardLayout title="My classes" subtitle="Each class is one subject you teach in one section. Pick a quarter to encode grades.">
      {isLoading ? (
        <PageLoader rows={6} />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.classes.length ? (
        <Card><EmptyState icon="layers" title="No classes yet" description="The registrar hasn't assigned you any classes for this school year." /></Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted">
            {Object.entries(DOT).map(([label, cls]) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <span className={clsx('h-2.5 w-2.5 rounded-full', cls)} /> {label}
              </span>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.classes.map((c) => (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-brand-800">{c.subject.code}</p>
                    <h3 className="font-bold text-ink truncate">{c.subject.title}</h3>
                  </div>
                  {c.section.strand && <Badge tone="brand">{c.section.strand}</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {c.section.name} · {c.section.gradeLevel} · {plural(c.section.studentCount, 'student')}
                </p>

                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((q) => {
                    const s = c.quarters[q];
                    return (
                      <Link
                        key={q}
                        to={`/teacher/encode-grades?class=${c.id}&q=${q}`}
                        className={clsx(
                          'relative rounded-xl border px-2 py-2 text-center transition-colors hover:border-brand-300',
                          q === data.currentQuarter ? 'border-brand-200 bg-brand-50/50' : 'border-line'
                        )}
                        title={`Q${q}: ${s.status} (${s.encoded}/${s.total})`}
                      >
                        <span className="block text-[11px] font-semibold text-muted">Q{q}</span>
                        <span className={clsx('mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold', DOT[s.status])}>
                          {s.status === 'Locked' ? <Icon name="lock" size={12} /> : s.encoded || '–'}
                        </span>
                        {s.pendingUnlock && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warn-600" />}
                      </Link>
                    );
                  })}
                </div>

                <Link
                  to={`/teacher/encode-grades?class=${c.id}&q=${data.currentQuarter}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-brand-800 text-white text-sm font-semibold hover:bg-brand-900"
                >
                  <Icon name="pencil" size={15} /> Encode Q{data.currentQuarter}
                </Link>
              </Card>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
