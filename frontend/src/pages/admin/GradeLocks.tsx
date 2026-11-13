import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageLoader, Progress, SearchInput, Segmented,
  SheetStatus, Table, Textarea, Toolbar, useConfirm,
} from '../../components/ui';
import { useApiMutation, useDebounced } from '../../hooks/useReference';
import api from '../../lib/api';
import { formatDateTime, score, timeAgo } from '../../lib/format';

interface Sheet {
  sectionSubjectId: string;
  section: string;
  subject: string;
  subjectTitle: string;
  teacher: string;
  total: number;
  encoded: number;
  locked: number;
  status: string;
  lockedAt: string | null;
  pendingRequestId: string | null;
}
interface SheetsResponse {
  quarter: number;
  summary: { total: number; locked: number; complete: number; inProgress: number; notStarted: number; pendingRequests: number };
  sheets: Sheet[];
}
interface UnlockRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  adminNote: string | null;
  requestedBy: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  quarter: number;
  section: string;
  subject: string;
  subjectTitle: string;
  teacher: string;
}

export default function GradeLocks() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'requests' ? 'requests' : 'sheets';
  const { data: pendingCount } = useQuery({
    queryKey: ['admin', 'unlock-requests', 'pending'],
    queryFn: () => api.get<{ requests: UnlockRequest[] }>('/admin/unlock-requests', { params: { status: 'pending' } }).then((r) => r.data.requests),
  });

  return (
    <DashboardLayout title="Grade sheets" subtitle="Monitor submission per class and quarter, and handle unlock requests.">
      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={(v) => setParams(v === 'sheets' ? {} : { tab: v })}
          options={[
            { value: 'sheets', label: 'Sheets' },
            { value: 'requests', label: 'Unlock requests', count: pendingCount?.length ?? 0 },
          ]}
        />
      </div>
      {tab === 'sheets' ? <Sheets /> : <Requests />}
    </DashboardLayout>
  );
}

function Sheets() {
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<{ settings: Record<string, string> }>('/admin/settings').then((r) => r.data.settings),
  });
  const [picked, setQuarter] = useState<number | null>(null);
  const quarter = picked ?? Number(settings.data?.current_quarter ?? 1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [viewing, setViewing] = useState<Sheet | null>(null);
  const confirm = useConfirm<{ sheet: Sheet; lock: boolean }>();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'grade-sheets', { quarter, status, q }],
    queryFn: () => api.get<SheetsResponse>('/admin/grade-sheets', { params: { quarter, status: status || undefined, search: q || undefined } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const toggle = useApiMutation(
    ({ sheet, lock }: { sheet: Sheet; lock: boolean }) => api.post(`/admin/grade-sheets/${lock ? 'lock' : 'unlock'}`, { sectionSubjectId: sheet.sectionSubjectId, quarter }),
    { success: ({ sheet, lock }) => `${sheet.subject} · ${sheet.section} ${lock ? 'locked' : 'unlocked'}`, invalidate: [['admin']], onSuccess: confirm.close }
  );

  const s = data?.summary;

  return (
    <>
      <Card>
        <Toolbar>
          <Segmented size="sm" value={quarter} onChange={setQuarter} options={[1, 2, 3, 4].map((n) => ({ value: n, label: `Q${n}` }))} />
          <Segmented
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All', count: s?.total },
              { value: 'Locked', label: 'Locked', count: s?.locked },
              { value: 'Complete', label: 'Complete', count: s?.complete },
              { value: 'In progress', label: 'In progress', count: s?.inProgress },
              { value: 'Not started', label: 'Not started', count: s?.notStarted },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Section, subject or teacher…" />
        </Toolbar>

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : !data?.sheets.length ? (
          <EmptyState icon="lock" title="No sheets match" />
        ) : (
          <Table>
            <thead className="border-b border-line">
              <tr>
                <th className="th">Class</th>
                <th className="th">Teacher</th>
                <th className="th w-44">Encoded</th>
                <th className="th">Status</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className={isFetching ? 'opacity-60 divide-y divide-line' : 'divide-y divide-line'}>
              {data.sheets.map((sh) => (
                <tr key={sh.sectionSubjectId} className="hover:bg-canvas/60">
                  <td className="td">
                    <p className="font-semibold">{sh.subject} <span className="font-normal text-muted">· {sh.section}</span></p>
                    <p className="text-xs text-muted truncate max-w-xs">{sh.subjectTitle}</p>
                  </td>
                  <td className="td whitespace-nowrap">{sh.teacher}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Progress value={sh.encoded} max={sh.total} tone={sh.status === 'Locked' ? 'success' : 'brand'} className="w-20" />
                      <span className="text-xs tabular-nums text-muted">{sh.encoded}/{sh.total}</span>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap items-center gap-1">
                      <SheetStatus status={sh.status} />
                      {sh.pendingRequestId && <Badge tone="warn" icon="unlock">Unlock requested</Badge>}
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" icon="eye" onClick={() => setViewing(sh)}>View</Button>
                      {sh.locked > 0 ? (
                        <Button size="sm" variant="ghost" icon="unlock" onClick={() => confirm.ask({ sheet: sh, lock: false })}>Unlock</Button>
                      ) : sh.encoded > 0 ? (
                        <Button size="sm" variant="ghost" icon="lock" onClick={() => confirm.ask({ sheet: sh, lock: true })}>Lock</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {viewing && <SheetModal sheet={viewing} quarter={quarter} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && toggle.mutate(confirm.target)}
        loading={toggle.isPending}
        tone={confirm.target?.lock ? 'primary' : 'danger'}
        title={`${confirm.target?.lock ? 'Lock' : 'Unlock'} ${confirm.target?.sheet.subject} · ${confirm.target?.sheet.section} (Q${quarter})?`}
        message={
          confirm.target?.lock
            ? 'The teacher will no longer be able to change these grades.'
            : 'The teacher will be able to edit these grades again. This action is recorded in the audit log.'
        }
        confirmLabel={confirm.target?.lock ? 'Lock sheet' : 'Unlock sheet'}
      />
    </>
  );
}

function SheetModal({ sheet, quarter, onClose }: { sheet: Sheet; quarter: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'grade-sheet', sheet.sectionSubjectId, quarter],
    queryFn: () =>
      api
        .get<{ rows: { lrn: string; name: string; score: number | null; locked: boolean }[]; stats: { encoded: number; total: number; average: number | null } }>(
          `/admin/grade-sheets/${sheet.sectionSubjectId}`,
          { params: { quarter } }
        )
        .then((r) => r.data),
  });
  return (
    <Modal open onClose={onClose} title={`${sheet.subject} · ${sheet.section}`} description={`Quarter ${quarter} · ${sheet.teacher}${data ? ` · class average ${score(data.stats.average)}` : ''}`}>
      {isLoading ? (
        <PageLoader rows={6} />
      ) : (
        <ul className="divide-y divide-line border border-line rounded-xl">
          {data?.rows.map((r, i) => (
            <li key={r.lrn} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-6 text-xs text-muted tabular-nums">{i + 1}</span>
              <span className="flex-1 truncate">{r.name}</span>
              <span className={r.score !== null && r.score < 75 ? 'font-semibold text-danger-600 tabular-nums' : 'font-semibold tabular-nums'}>{score(r.score)}</span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function Requests() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [reviewing, setReviewing] = useState<{ req: UnlockRequest; decision: 'approved' | 'rejected' } | null>(null);
  const [note, setNote] = useState('');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'unlock-requests', status],
    queryFn: () => api.get<{ requests: UnlockRequest[] }>('/admin/unlock-requests', { params: { status } }).then((r) => r.data.requests),
  });
  const review = useApiMutation(
    ({ req, decision }: { req: UnlockRequest; decision: string }) => api.post(`/admin/unlock-requests/${req.id}/review`, { status: decision, adminNote: note }),
    { success: ({ decision }) => (decision === 'approved' ? 'Approved — the sheet is unlocked' : 'Request rejected'), invalidate: [['admin']], onSuccess: () => setReviewing(null) }
  );

  return (
    <Card>
      <Toolbar>
        <Segmented
          size="sm"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </Toolbar>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon="checkCircle" title={status === 'pending' ? 'No pending requests' : `No ${status} requests`} />
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <li key={r.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {r.subject} · {r.section} <Badge tone="neutral" className="ml-1">Q{r.quarter}</Badge>
                  </p>
                  <p className="text-xs text-muted">
                    {r.teacher} · requested {timeAgo(r.createdAt)}
                  </p>
                </div>
                {r.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setNote(''); setReviewing({ req: r, decision: 'rejected' }); }}>Reject</Button>
                    <Button size="sm" variant="primary" icon="unlock" onClick={() => { setNote(''); setReviewing({ req: r, decision: 'approved' }); }}>Approve & unlock</Button>
                  </div>
                ) : (
                  <Badge tone={r.status === 'approved' ? 'success' : 'danger'}>{r.status}</Badge>
                )}
              </div>
              <blockquote className="mt-3 border-l-2 border-gold-400 pl-3 text-sm text-ink-soft">{r.reason}</blockquote>
              {r.status !== 'pending' && (
                <p className="mt-2 text-xs text-muted">
                  {r.reviewedBy ?? 'Registrar'} · {formatDateTime(r.reviewedAt)}
                  {r.adminNote && <> — “{r.adminNote}”</>}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        size="sm"
        title={reviewing?.decision === 'approved' ? 'Approve unlock request' : 'Reject unlock request'}
        description={reviewing && `${reviewing.req.subject} · ${reviewing.req.section} · Q${reviewing.req.quarter}`}
        footer={
          <>
            <Button onClick={() => setReviewing(null)}>Cancel</Button>
            <Button
              variant={reviewing?.decision === 'approved' ? 'primary' : 'danger'}
              loading={review.isPending}
              disabled={reviewing?.decision === 'rejected' && !note.trim()}
              onClick={() => reviewing && review.mutate(reviewing)}
            >
              {reviewing?.decision === 'approved' ? 'Approve & unlock' : 'Reject'}
            </Button>
          </>
        }
      >
        <Field label={reviewing?.decision === 'approved' ? 'Note to teacher (optional)' : 'Reason for rejecting'} required={reviewing?.decision === 'rejected'}>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus />
        </Field>
        {reviewing?.decision === 'approved' && <p className="mt-3 text-xs text-muted">All grades on this sheet will be unlocked so the teacher can edit and resubmit.</p>}
      </Modal>
    </Card>
  );
}
