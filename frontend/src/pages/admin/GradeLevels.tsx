import { FormEvent, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader, Textarea, useConfirm } from '../../components/ui';
import { useApiMutation, useGradeLevels, useStrands } from '../../hooks/useReference';
import api from '../../lib/api';
import { plural } from '../../lib/format';
import type { Strand } from '../../types';

const emptyStrand = { code: '', name: '', description: '' };

export default function GradeLevels() {
  const levels = useGradeLevels();
  const strands = useStrands();
  const [editing, setEditing] = useState<Strand | 'new' | null>(null);
  const [form, setForm] = useState(emptyStrand);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<Strand>();

  const save = useApiMutation(
    (f: typeof emptyStrand) => (editing === 'new' ? api.post('/admin/strands', f) : api.put(`/admin/strands/${(editing as Strand).id}`, f)),
    { success: 'Strand saved', invalidate: [['admin', 'strands']], onSuccess: () => setEditing(null) }
  );
  const remove = useApiMutation((s: Strand) => api.delete(`/admin/strands/${s.id}`), {
    success: 'Strand deleted',
    invalidate: [['admin', 'strands']],
    onSuccess: confirm.close,
  });

  const open = (s: Strand | 'new') => {
    setErrors({});
    setForm(s === 'new' ? emptyStrand : { code: s.code, name: s.name, description: s.description ?? '' });
    setEditing(s);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  return (
    <DashboardLayout title="Grade levels & strands" subtitle="Junior High (Grades 7–10) and Senior High (Grades 11–12) with academic strands.">
      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader title="Grade levels" description="Fixed by the K–12 curriculum" />
          {levels.isLoading ? (
            <PageLoader rows={6} />
          ) : levels.error ? (
            <ErrorState error={levels.error} onRetry={levels.refetch} />
          ) : (
            <ul className="divide-y divide-line -my-2">
              {levels.data!.map((gl) => (
                <li key={gl.id} className="flex items-center gap-4 py-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-800 font-extrabold tabular-nums">{gl.number}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{gl.name}</p>
                    <p className="text-xs text-muted">
                      {plural(gl.sectionCount ?? 0, 'section')} (all years) · {plural(gl.subjectCount ?? 0, 'subject')}
                    </p>
                  </div>
                  <Badge tone={gl.isSeniorHigh ? 'gold' : 'info'}>{gl.isSeniorHigh ? 'Senior High' : 'Junior High'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Senior High strands" description="Used by Grade 11–12 sections and specialized subjects" actions={<Button size="sm" variant="primary" icon="plus" onClick={() => open('new')}>Add strand</Button>} />
          {strands.isLoading ? (
            <PageLoader rows={4} />
          ) : strands.error ? (
            <ErrorState error={strands.error} onRetry={strands.refetch} />
          ) : strands.data!.length === 0 ? (
            <EmptyState icon="layers" title="No strands yet" />
          ) : (
            <ul className="divide-y divide-line -my-2">
              {strands.data!.map((s) => (
                <li key={s.id} className="flex items-start gap-4 py-3">
                  <Badge tone="brand" className="mt-0.5 min-w-[64px] justify-center">{s.code}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{s.name}</p>
                    {s.description && <p className="text-xs text-muted">{s.description}</p>}
                    <p className="text-xs text-muted mt-0.5">
                      {plural(s.sectionCount ?? 0, 'section')} · {plural(s.subjectCount ?? 0, 'subject')}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <IconButton icon="edit" label={`Edit ${s.code}`} onClick={() => open(s)} />
                    <IconButton icon="trash" tone="danger" label={`Delete ${s.code}`} disabled={!!(s.sectionCount || s.subjectCount)} onClick={() => confirm.ask(s)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add strand' : 'Edit strand'}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="strand-form" loading={save.isPending}>Save</Button>
          </>
        }
      >
        <form id="strand-form" onSubmit={submit} className="space-y-4">
          <Field label="Code" required error={errors.code} hint="Short code shown on sections, e.g. STEM">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} invalid={!!errors.code} autoFocus />
          </Field>
          <Field label="Full name" required error={errors.name}>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title={`Delete ${confirm.target?.code}?`}
        message="This strand isn't used by any section or subject, so it can be safely removed."
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
