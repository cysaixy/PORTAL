import { Fragment, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Card, EmptyState, ErrorState, IconButton, PageLoader, Pagination, SearchInput, Select, Table, Toolbar } from '../../components/ui';
import { useDebounced } from '../../hooks/useReference';
import api from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Pagination as P } from '../../types';

interface Log {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user: { email: string; role: string };
}

const TONE: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'neutral'> = {
  CREATE: 'info', ENCODE: 'info', ENROLL: 'info', UPDATE: 'neutral', LOCK: 'success',
  UNLOCK: 'warn', REQUEST_UNLOCK: 'warn', REMIND: 'warn', DELETE: 'danger', REJECT_UNLOCK: 'danger', UNENROLL: 'danger',
};

function summary(l: Log) {
  const a = (l.after ?? {}) as Record<string, any>;
  const b = (l.before ?? {}) as Record<string, any>;
  if (a.section && a.subject) return `${a.subject} · ${a.section}${a.quarter ? ` · Q${a.quarter}` : ''}${a.changes ? ` · ${a.changes.length} change(s)` : a.count ? ` · ${a.count} grade(s)` : ''}`;
  const name = a.name ?? a.title ?? a.label ?? a.code ?? a.email ?? a.lrn ?? b.name ?? b.title ?? b.label ?? b.code ?? b.email ?? b.lrn;
  return name ? String(name) : l.entityId;
}

export default function AuditLog() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [action, entity, q]);

  const filters = useQuery({
    queryKey: ['admin', 'audit-filters'],
    queryFn: () => api.get<{ actions: string[]; entities: string[] }>('/admin/audit-logs/filters').then((r) => r.data),
  });
  const list = useQuery({
    queryKey: ['admin', 'audit', { action, entity, q, page }],
    queryFn: () =>
      api.get<{ logs: Log[]; pagination: P }>('/admin/audit-logs', { params: { page, limit: 30, action: action || undefined, entity: entity || undefined, search: q || undefined } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const pg = list.data?.pagination;

  return (
    <DashboardLayout title="Audit log" subtitle="Every change to records and grades, newest first.">
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by user email…" />
          <div className="w-44">
            <Select value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
              <option value="">All actions</option>
              {filters.data?.actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ').toLowerCase()}</option>)}
            </Select>
          </div>
          <div className="w-44">
            <Select value={entity} onChange={(e) => setEntity(e.target.value)} aria-label="Record type">
              <option value="">All records</option>
              {filters.data?.entities.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </div>
        </Toolbar>

        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : !list.data?.logs.length ? (
          <EmptyState icon="history" title="No entries" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-line">
                <tr>
                  <th className="th">When</th>
                  <th className="th">User</th>
                  <th className="th">Action</th>
                  <th className="th">Record</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.logs.map((l) => (
                  <Fragment key={l.id}>
                    <tr className="hover:bg-canvas/60">
                      <td className="td whitespace-nowrap text-xs text-muted">{formatDateTime(l.createdAt)}</td>
                      <td className="td">
                        <p className="truncate max-w-[220px]">{l.user.email}</p>
                        <p className="text-xs text-muted capitalize">{l.user.role.toLowerCase()}</p>
                      </td>
                      <td className="td"><Badge tone={TONE[l.action] ?? 'neutral'}>{l.action.replace(/_/g, ' ').toLowerCase()}</Badge></td>
                      <td className="td">
                        <p className="font-medium">{l.entity}</p>
                        <p className="text-xs text-muted truncate max-w-sm">{summary(l)}</p>
                      </td>
                      <td className="td text-right">
                        {(l.before || l.after) && (
                          <IconButton icon={expanded === l.id ? 'chevronDown' : 'chevronRight'} label="Show details" onClick={() => setExpanded(expanded === l.id ? null : l.id)} />
                        )}
                      </td>
                    </tr>
                    {expanded === l.id && (
                      <tr className="bg-canvas/60">
                        <td colSpan={5} className="px-4 pb-4">
                          <div className="grid md:grid-cols-2 gap-3 text-xs">
                            {l.before && (
                              <div>
                                <p className="font-semibold text-muted mb-1">Before</p>
                                <pre className="rounded-lg bg-white border border-line p-3 overflow-x-auto max-h-60">{JSON.stringify(l.before, null, 2)}</pre>
                              </div>
                            )}
                            {l.after && (
                              <div>
                                <p className="font-semibold text-muted mb-1">After</p>
                                <pre className="rounded-lg bg-white border border-line p-3 overflow-x-auto max-h-60">{JSON.stringify(l.after, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
            {pg && <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onChange={setPage} />}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
