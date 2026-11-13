import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Button, Card, EmptyState, ErrorState, PageLoader, Pagination, Progress, SearchInput, Segmented, StatTile, Toolbar } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApiMutation, useDebounced } from '../../hooks/useReference';
import api, { assetUrl } from '../../lib/api';
import type { Pagination as P } from '../../types';

interface Row {
  id: string;
  lrn: string;
  name: string;
  email: string;
  section: string | null;
  grade: string | null;
  photoUrl: string | null;
  signatureUrl: string | null;
  ready: boolean;
}
interface Stats {
  totalStudents: number;
  withPhoto: number;
  withSignature: number;
  withBoth: number;
  missing: number;
}

export default function IdCards() {
  const [status, setStatus] = useState<'' | 'ready' | 'missing'>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, status]);

  const stats = useQuery({ queryKey: ['admin', 'id-stats'], queryFn: () => api.get<Stats>('/admin/id-assets/stats').then((r) => r.data) });
  const list = useQuery({
    queryKey: ['admin', 'id-assets', { q, status, page }],
    queryFn: () => api.get<{ students: Row[]; pagination: P }>('/admin/id-assets', { params: { page, limit: 24, status: status || undefined, search: q || undefined } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const remind = useApiMutation((r: Row) => api.post(`/admin/id-assets/${r.id}/remind`), { success: (r) => `Reminder logged for ${r.name}` });

  const s = stats.data;
  const pg = list.data?.pagination;

  return (
    <DashboardLayout title="ID photos & signatures" subtitle="Track which students are ready for ID printing.">
      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatTile tone="brand" icon="idcard" label="Ready to print" value={s.withBoth} hint={`of ${s.totalStudents} students`}>
            <Progress value={s.withBoth} max={s.totalStudents} tone="gold" />
          </StatTile>
          <StatTile icon="user" label="Photos uploaded" value={s.withPhoto} />
          <StatTile icon="signature" label="Signatures uploaded" value={s.withSignature} />
          <StatTile tone="gold" icon="alert" label="Still missing" value={s.missing} />
        </div>
      )}

      <Card>
        <Toolbar>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All' },
              { value: 'missing', label: 'Missing files' },
              { value: 'ready', label: 'Ready' },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or LRN…" />
        </Toolbar>

        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : !list.data?.students.length ? (
          <EmptyState icon="idcard" title="No students match" />
        ) : (
          <>
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {list.data.students.map((r) => (
                <li key={r.id} className="flex gap-3 rounded-xl border border-line p-3">
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-canvas flex items-center justify-center text-muted">
                    {r.photoUrl ? <img src={assetUrl(r.photoUrl)!} alt="" className="h-full w-full object-cover" /> : <Icon name="user" size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{r.name}</p>
                    <p className="text-xs text-muted">{r.section ?? 'Not enrolled'} · {r.lrn}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge tone={r.photoUrl ? 'success' : 'warn'} icon={r.photoUrl ? 'check' : undefined}>Photo</Badge>
                      <Badge tone={r.signatureUrl ? 'success' : 'warn'} icon={r.signatureUrl ? 'check' : undefined}>Signature</Badge>
                    </div>
                    {r.signatureUrl && <img src={assetUrl(r.signatureUrl)!} alt="Signature" className="mt-2 h-6 object-contain" />}
                  </div>
                  {!r.ready && (
                    <Button size="sm" variant="ghost" icon="bell" onClick={() => remind.mutate(r)} className="self-start" aria-label={`Remind ${r.name}`}>
                      Remind
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            {pg && <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onChange={setPage} />}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
