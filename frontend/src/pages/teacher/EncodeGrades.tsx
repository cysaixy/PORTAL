import { ClipboardEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageLoader, Segmented, Select, SheetStatus, Textarea,
} from '../../components/ui';
import { Icon } from '../../components/Icon';
import { useApiMutation } from '../../hooks/useReference';
import api from '../../lib/api';
import { formatDateTime, score as fmt } from '../../lib/format';
import { useTeacherClasses } from './MySections';

interface Row {
  studentSectionId: string;
  student: { id: string; lrn: string; firstName: string; middleName: string | null; lastName: string; sex: 'M' | 'F' };
  score: number | null;
  locked: boolean;
  allQuarters: Record<number, number | null>;
}
interface Sheet {
  assignment: { id: string; subject: { code: string; title: string }; section: { name: string; gradeLevel: string; strand: string | null }; schoolYear: string };
  quarter: number;
  passingScore: number;
  locked: boolean;
  pendingUnlock: { id: string; reason: string; createdAt: string } | null;
  rows: Row[];
  stats: { total: number; encoded: number; average: number | null; highest: number | null; lowest: number | null; failing: number };
}

const MIN = 60;
const MAX = 100;

function validate(v: string): string | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return 'Not a number';
  if (n < MIN || n > MAX) return `Must be ${MIN}–${MAX}`;
  if (!/^\d+(\.\d{1,2})?$/.test(v.trim())) return 'Max 2 decimals';
  return null;
}

export default function EncodeGrades() {
  const [params, setParams] = useSearchParams();
  const classes = useTeacherClasses();
  const classId = params.get('class') ?? classes.data?.classes[0]?.id ?? '';
  const quarter = Number(params.get('q') ?? classes.data?.currentQuarter ?? 1);

  const sheetQuery = useQuery({
    queryKey: ['teacher', 'sheet', classId, quarter],
    queryFn: () => api.get<Sheet>(`/teacher/classes/${classId}/sheet`, { params: { quarter } }).then((r) => r.data),
    enabled: !!classId,
  });
  const sheet = sheetQuery.data;

  // Draft values keyed by studentSectionId (string as typed)
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    if (sheet) setDraft(Object.fromEntries(sheet.rows.map((r) => [r.studentSectionId, r.score === null ? '' : String(r.score)])));
  }, [sheet]);

  const original = useMemo(() => Object.fromEntries((sheet?.rows ?? []).map((r) => [r.studentSectionId, r.score === null ? '' : String(r.score)])), [sheet]);
  const dirtyIds = Object.keys(draft).filter((id) => Number(draft[id] || NaN) !== Number(original[id] || NaN) && !(draft[id] === '' && original[id] === ''));
  const errors = Object.fromEntries(Object.entries(draft).map(([id, v]) => [id, validate(v)]).filter(([, e]) => e)) as Record<string, string>;
  const hasErrors = Object.keys(errors).length > 0;
  const dirty = dirtyIds.length > 0;

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const select = (next: { class?: string; q?: number }) => {
    if (dirty && !window.confirm('You have unsaved grades. Leave without saving?')) return;
    setParams({ class: next.class ?? classId, q: String(next.q ?? quarter) });
  };

  const invalidate = [['teacher']];
  const save = useApiMutation(
    () =>
      api.put(`/teacher/classes/${classId}/sheet`, {
        quarter,
        grades: dirtyIds.map((id) => ({ studentSectionId: id, score: draft[id].trim() === '' ? null : Number(draft[id]) })),
      }),
    { success: () => `Saved ${dirtyIds.length} grade${dirtyIds.length === 1 ? '' : 's'}`, invalidate }
  );
  const [confirmLock, setConfirmLock] = useState(false);
  const lock = useApiMutation(() => api.post(`/teacher/classes/${classId}/lock`, { quarter }), {
    success: 'Sheet submitted and locked',
    invalidate,
    onSuccess: () => setConfirmLock(false),
  });
  const [requesting, setRequesting] = useState(false);
  const [reason, setReason] = useState('');
  const request = useApiMutation(() => api.post(`/teacher/classes/${classId}/unlock-request`, { quarter, reason }), {
    success: 'Unlock request sent to the registrar',
    invalidate,
    onSuccess: () => setRequesting(false),
  });

  const doSave = useCallback(() => {
    if (dirty && !hasErrors && !save.isPending) save.mutate(undefined);
  }, [dirty, hasErrors, save]);

  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [doSave]);

  // Keyboard navigation between inputs
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const focusRow = (i: number) => {
    const el = inputs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };
  const onKey = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusRow(i + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusRow(i - 1);
    }
  };
  // Paste a column of numbers (e.g. from Excel) starting at this row
  const onPaste = (i: number) => (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    const values = text.split(/\r?\n/).map((s) => s.split('\t')[0].trim()).filter((s, idx, arr) => s !== '' || idx < arr.length - 1);
    if (values.length <= 1 || !sheet) return;
    e.preventDefault();
    setDraft((d) => {
      const next = { ...d };
      values.forEach((v, k) => {
        const row = sheet.rows[i + k];
        if (row) next[row.studentSectionId] = v;
      });
      return next;
    });
  };

  const current = classes.data?.classes.find((c) => c.id === classId);
  const live = useMemo(() => {
    const nums = Object.values(draft).filter((v) => v.trim() !== '' && !validate(v)).map(Number);
    return {
      encoded: nums.length,
      average: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100 : null,
      failing: sheet ? nums.filter((n) => n < sheet.passingScore).length : 0,
    };
  }, [draft, sheet]);

  const total = sheet?.rows.length ?? 0;
  const complete = total > 0 && live.encoded === total;
  const status = sheet?.locked ? 'Locked' : live.encoded === 0 ? 'Not started' : complete ? 'Complete' : 'In progress';
  const boysEnd = sheet?.rows.findIndex((r) => r.student.sex === 'F') ?? -1;

  return (
    <DashboardLayout title="Encode grades" subtitle="Type each student's transmuted quarterly grade. Press Enter to go to the next student, Ctrl+S to save.">
      {classes.isLoading ? (
        <PageLoader />
      ) : !classes.data?.classes.length ? (
        <Card><EmptyState icon="layers" title="No classes assigned" description="You'll be able to encode grades once the registrar assigns you a class." /></Card>
      ) : (
        <>
          {/* Selector bar */}
          <Card className="mb-4" padded={false}>
            <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-4">
              <div className="lg:w-96">
                <Select value={classId} onChange={(e) => select({ class: e.target.value })} aria-label="Class">
                  {classes.data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.subject.code} — {c.section.name} ({c.section.studentCount})
                    </option>
                  ))}
                </Select>
              </div>
              <Segmented
                value={quarter}
                onChange={(q) => select({ q })}
                options={[1, 2, 3, 4].map((q) => ({
                  value: q,
                  label: (
                    <span className="inline-flex items-center gap-1">
                      Q{q}
                      {current?.quarters[q].status === 'Locked' && <Icon name="lock" size={11} />}
                    </span>
                  ),
                }))}
              />
              <div className="flex-1" />
              {sheet && <SheetStatus status={status} />}
            </div>
          </Card>

          {sheetQuery.isLoading ? (
            <Card><PageLoader rows={10} /></Card>
          ) : sheetQuery.error ? (
            <Card><ErrorState error={sheetQuery.error} onRetry={sheetQuery.refetch} /></Card>
          ) : sheet ? (
            <div className="grid xl:grid-cols-[1fr_300px] gap-4 items-start">
              <Card padded={false}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-line">
                  <div>
                    <h2 className="font-bold">{sheet.assignment.subject.title}</h2>
                    <p className="text-xs text-muted">
                      {sheet.assignment.section.name} · {sheet.assignment.section.gradeLevel} · Quarter {quarter} · SY {sheet.assignment.schoolYear}
                    </p>
                  </div>
                  {!sheet.locked && (
                    <div className="flex gap-2">
                      <Button icon="save" onClick={doSave} disabled={!dirty || hasErrors} loading={save.isPending}>
                        {dirty ? `Save ${dirtyIds.length}` : 'Saved'}
                      </Button>
                      <Button variant="primary" icon="lock" disabled={!complete || dirty || hasErrors} onClick={() => setConfirmLock(true)} title={!complete ? 'Encode every student first' : dirty ? 'Save first' : undefined}>
                        Submit & lock
                      </Button>
                    </div>
                  )}
                </div>

                {sheet.locked && (
                  <div className="px-5 pt-4">
                    {sheet.pendingUnlock ? (
                      <Alert tone="warn" title="Unlock requested">
                        Sent {formatDateTime(sheet.pendingUnlock.createdAt)} — “{sheet.pendingUnlock.reason}”. The registrar will review it.
                      </Alert>
                    ) : (
                      <Alert
                        tone="success"
                        title="This sheet is submitted and locked"
                        action={<Button size="sm" icon="unlock" onClick={() => { setReason(''); setRequesting(true); }}>Request unlock</Button>}
                      >
                        Grades are visible to students. Ask the registrar to unlock it if you need to correct something.
                      </Alert>
                    )}
                  </div>
                )}

                {sheet.rows.length === 0 ? (
                  <EmptyState icon="users" title="No students in this section yet" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-line bg-canvas/50">
                        <tr>
                          <th className="th w-10">#</th>
                          <th className="th">Learner</th>
                          {[1, 2, 3, 4].filter((q) => q !== quarter).map((q) => (
                            <th key={q} className="th text-center w-14 hidden md:table-cell">Q{q}</th>
                          ))}
                          <th className="th text-center w-36">Q{quarter} grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.map((r, i) => {
                          const v = draft[r.studentSectionId] ?? '';
                          const err = errors[r.studentSectionId];
                          const isDirty = dirtyIds.includes(r.studentSectionId);
                          const failing = v !== '' && !err && Number(v) < sheet.passingScore;
                          return (
                            <tr key={r.studentSectionId} className={clsx('border-b border-line/70', i === boysEnd && 'border-t-2 border-t-line-strong')}>
                              <td className="td text-xs text-muted tabular-nums">{i + 1}</td>
                              <td className="td">
                                <p className="font-medium">
                                  {r.student.lastName}, {r.student.firstName}
                                  {r.student.middleName ? ` ${r.student.middleName[0]}.` : ''}
                                </p>
                                <p className="text-[11px] text-muted">{r.student.lrn}</p>
                              </td>
                              {[1, 2, 3, 4].filter((q) => q !== quarter).map((q) => (
                                <td key={q} className="td text-center text-xs text-muted tabular-nums hidden md:table-cell">{fmt(r.allQuarters[q])}</td>
                              ))}
                              <td className="td">
                                <div className="relative">
                                  <input
                                    ref={(el) => (inputs.current[i] = el)}
                                    type="text"
                                    inputMode="decimal"
                                    value={v}
                                    disabled={sheet.locked}
                                    onChange={(e) => setDraft({ ...draft, [r.studentSectionId]: e.target.value.replace(/[^\d.]/g, '') })}
                                    onKeyDown={onKey(i)}
                                    onPaste={onPaste(i)}
                                    onFocus={(e) => e.target.select()}
                                    aria-label={`Q${quarter} grade for ${r.student.firstName} ${r.student.lastName}`}
                                    aria-invalid={!!err}
                                    title={err ?? undefined}
                                    className={clsx(
                                      'input text-center font-semibold tabular-nums h-9',
                                      err && 'input-error',
                                      !err && isDirty && 'border-gold-500 bg-gold-50',
                                      !err && failing && 'text-danger-600',
                                      sheet.locked && 'bg-canvas'
                                    )}
                                  />
                                  {err && <span className="absolute -bottom-4 left-0 right-0 text-center text-[10px] text-danger-600">{err}</span>}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              {/* Summary */}
              <div className="space-y-4 xl:sticky xl:top-20">
                <Card>
                  <p className="text-xs font-semibold text-muted">Encoded</p>
                  <p className="text-3xl font-extrabold tabular-nums">
                    {live.encoded}<span className="text-lg text-muted">/{total}</span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-ink/5 overflow-hidden">
                    <div className={clsx('h-full rounded-full', complete ? 'bg-success-600' : 'bg-brand-800')} style={{ width: `${total ? (live.encoded / total) * 100 : 0}%` }} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-muted">Class average</dt>
                      <dd className="font-bold tabular-nums">{fmt(live.average)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">Below {sheet.passingScore}</dt>
                      <dd className={clsx('font-bold tabular-nums', live.failing && 'text-danger-600')}>{live.failing}</dd>
                    </div>
                  </dl>
                  {dirty && (
                    <p className="mt-4 text-xs text-gold-900 bg-gold-50 rounded-lg px-3 py-2">
                      {dirtyIds.length} unsaved change{dirtyIds.length === 1 ? '' : 's'} · highlighted in yellow
                    </p>
                  )}
                </Card>
                <Card>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Tips</p>
                  <ul className="space-y-2 text-xs text-ink-soft">
                    <li className="flex gap-2"><Badge>Enter</Badge> next student</li>
                    <li className="flex gap-2"><Badge>Ctrl + S</Badge> save</li>
                    <li>Paste a column of grades from Excel into the first box to fill the whole list.</li>
                    <li>Leave a box empty to clear a grade. Grades must be {MIN}–{MAX}.</li>
                  </ul>
                </Card>
              </div>
            </div>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirmLock}
        onClose={() => setConfirmLock(false)}
        onConfirm={() => lock.mutate(undefined)}
        loading={lock.isPending}
        tone="primary"
        title={`Submit Q${quarter} grades?`}
        message={
          <>
            Grades for <b>{sheet?.assignment.subject.code} · {sheet?.assignment.section.name}</b> will be locked and shown to students. You'll need the registrar's approval to change them later.
          </>
        }
        confirmLabel="Submit & lock"
      />

      <Modal
        open={requesting}
        onClose={() => setRequesting(false)}
        size="sm"
        title="Request unlock"
        description={sheet ? `${sheet.assignment.subject.code} · ${sheet.assignment.section.name} · Q${quarter}` : undefined}
        footer={
          <>
            <Button onClick={() => setRequesting(false)}>Cancel</Button>
            <Button variant="primary" disabled={reason.trim().length < 10} loading={request.isPending} onClick={() => request.mutate(undefined)}>
              Send request
            </Button>
          </>
        }
      >
        <Field label="Why do you need to change these grades?" required hint="At least 10 characters. The registrar sees this.">
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </DashboardLayout>
  );
}
