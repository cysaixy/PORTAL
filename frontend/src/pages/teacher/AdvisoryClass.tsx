import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Avatar, Badge, Card, CardHeader, EmptyState, ErrorState, PageLoader, SearchInput, Segmented, StatTile, Table, Toolbar } from '../../components/ui';
import api, { assetUrl } from '../../lib/api';
import { plural, score } from '../../lib/format';

interface Advisee {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  sex: 'M' | 'F';
  photoUrl: string | null;
  guardianName: string;
  guardianContact: string;
  quarterAverages: Record<number, number | null>;
  average: number | null;
  atRisk: boolean;
  idReady: boolean;
}
interface AdvisoryData {
  section: { id: string; name: string; gradeLevel: string; strand: string | null; schoolYear: string; capacity: number; subjects: { code: string; title: string; teacher: string }[] } | null;
  passingScore: number;
  students: Advisee[];
}

export default function AdvisoryClass() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['teacher', 'advisory'],
    queryFn: () => api.get<AdvisoryData>('/teacher/advisory').then((r) => r.data),
  });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'risk' | 'id'>('all');

  const students = useMemo(
    () =>
      (data?.students ?? []).filter(
        (s) =>
          `${s.lastName} ${s.firstName} ${s.lrn}`.toLowerCase().includes(search.toLowerCase()) &&
          (filter === 'all' || (filter === 'risk' && s.atRisk) || (filter === 'id' && !s.idReady))
      ),
    [data, search, filter]
  );

  const sec = data?.section;
  const all = data?.students ?? [];
  const classAvg = all.filter((s) => s.average !== null).map((s) => s.average!);

  return (
    <DashboardLayout
      title={sec ? `Advisory · ${sec.name}` : 'Advisory class'}
      subtitle={sec ? `${sec.gradeLevel}${sec.strand ? ` · ${sec.strand}` : ''} · SY ${sec.schoolYear}` : undefined}
    >
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !sec ? (
        <Card><EmptyState icon="users" title="No advisory class" description="You aren't assigned as adviser of a section this school year." /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatTile tone="brand" icon="users" label="Students" value={all.length} hint={`${all.filter((s) => s.sex === 'M').length} male · ${all.filter((s) => s.sex === 'F').length} female`} />
            <StatTile icon="chart" label="Class average" value={score(classAvg.length ? Math.round((classAvg.reduce((a, b) => a + b, 0) / classAvg.length) * 100) / 100 : null)} hint="Across all encoded grades" />
            <StatTile icon="alert" label={`Below ${data!.passingScore}`} value={all.filter((s) => s.atRisk).length} hint="Students who may need intervention" />
            <StatTile tone="gold" icon="idcard" label="ID ready" value={`${all.filter((s) => s.idReady).length}/${all.length}`} hint="Photo and signature uploaded" />
          </div>

          <Card>
            <Toolbar>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All', count: all.length },
                  { value: 'risk', label: 'At risk', count: all.filter((s) => s.atRisk).length },
                  { value: 'id', label: 'Missing ID', count: all.filter((s) => !s.idReady).length },
                ]}
              />
              <SearchInput value={search} onChange={setSearch} placeholder="Search student…" />
            </Toolbar>
            {students.length === 0 ? (
              <EmptyState icon="checkCircle" title="Nobody here" description="No students match this filter." />
            ) : (
              <Table>
                <thead className="border-b border-line">
                  <tr>
                    <th className="th">Student</th>
                    {[1, 2, 3, 4].map((q) => <th key={q} className="th text-center hidden md:table-cell">Q{q}</th>)}
                    <th className="th text-center">Average</th>
                    <th className="th">Guardian</th>
                    <th className="th">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {students.map((s) => (
                    <tr key={s.id} className={clsx('hover:bg-canvas/60', s.atRisk && 'bg-danger-50/40')}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={`${s.firstName} ${s.lastName}`} src={assetUrl(s.photoUrl)} size={32} />
                          <div>
                            <p className="font-medium">{s.lastName}, {s.firstName}</p>
                            <p className="text-[11px] text-muted">{s.lrn}</p>
                          </div>
                        </div>
                      </td>
                      {[1, 2, 3, 4].map((q) => (
                        <td key={q} className={clsx('td text-center tabular-nums hidden md:table-cell', s.quarterAverages[q] !== null && s.quarterAverages[q]! < data!.passingScore && 'text-danger-600 font-semibold')}>
                          {score(s.quarterAverages[q])}
                        </td>
                      ))}
                      <td className="td text-center">
                        <span className={clsx('font-bold tabular-nums', s.atRisk && 'text-danger-600')}>{score(s.average)}</span>
                      </td>
                      <td className="td">
                        <p className="truncate max-w-[160px]">{s.guardianName}</p>
                        <a href={`tel:${s.guardianContact}`} className="text-xs text-brand-800 hover:underline">{s.guardianContact}</a>
                      </td>
                      <td className="td">{s.idReady ? <Badge tone="success" icon="check">Ready</Badge> : <Badge tone="warn">Missing</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card>
            <CardHeader title="Subject teachers" description={plural(sec.subjects.length, 'subject')} />
            <ul className="grid sm:grid-cols-2 gap-x-6 divide-y divide-line sm:divide-y-0">
              {sec.subjects.map((s) => (
                <li key={s.code} className="flex items-center gap-3 py-2 sm:border-b sm:border-line">
                  <Badge className="min-w-[84px] justify-center">{s.code}</Badge>
                  <span className="flex-1 text-sm truncate">{s.title}</span>
                  <span className="text-xs text-muted">{s.teacher}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
