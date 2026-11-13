import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader, SearchInput, Select, Table, Toolbar, useConfirm } from '../../components/ui';
import { useApiMutation, useDebounced, useGradeLevels, useStrands } from '../../hooks/useReference';
import api from '../../lib/api';
import type { Subject, SubjectCategory } from '../../types';

const CATEGORY: Record<SubjectCategory, { label: string; tone: 'info' | 'gold' | 'brand' }> = {
  CORE: { label: 'Core', tone: 'info' },
  APPLIED: { label: 'Applied', tone: 'gold' },
  SPECIALIZED: { label: 'Specialized', tone: 'brand' },
};

const blank = { code: '', title: '', gradeLevelId: '', strandId: '', semester: '', category: 'CORE' as SubjectCategory };

export default function Subjects() {
  const { data: levels = [] } = useGradeLevels();
  const { data: strands = [] } = useStrands();
  const [grade, setGrade] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);

  const list = useQuery({
    queryKey: ['admin', 'subjects', { grade, q }],
    queryFn: () =>
      api.get<{ subjects: Subject[] }>('/admin/subjects', { params: { limit: 500, gradeLevelId: grade || undefined, search: q || undefined } }).then((r) => r.data.subjects),
  });

  const [editing, setEditing] = useState<Subject | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<Subject>();
  const level = levels.find((l) => l.id === form.gradeLevelId);

  const save = useApiMutation(
    (f: typeof blank) => {
      const body = {
        ...f,
        strandId: level?.isSeniorHigh ? f.strandId || null : null,
        semester: level?.isSeniorHigh && f.semester ? Number(f.semester) : null,
      };
      return editing === 'new' ? api.post('/admin/subjects', body) : api.put(`/admin/subjects/${(editing as Subject).id}`, body);
    },
    { success: 'Subject saved', invalidate: [['admin', 'subjects']], onSuccess: () => setEditing(null) }
  );
  const remove = useApiMutation((s: Subject) => api.delete(`/admin/subjects/${s.id}`), { success: 'Subject deleted', invalidate: [['admin', 'subjects']], onSuccess: confirm.close });

  const open = (s: Subject | 'new') => {
    setErrors({});
    setForm(
      s === 'new'
        ? { ...blank, gradeLevelId: grade }
        : { code: s.code, title: s.title, gradeLevelId: s.gradeLevelId, strandId: s.strandId ?? '', semester: s.semester ? String(s.semester) : '', category: s.category }
    );
    setEditing(s);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  const subjects = list.data ?? [];

  return (
    <DashboardLayout title="Subjects" subtitle="The subject catalogue per grade level." actions={<Button variant="primary" icon="plus" onClick={() => open('new')}>New subject</Button>}>
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search code or title…" />
          <div className="w-40">
            <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade level">
              <option value="">All grades</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
        </Toolbar>

        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : subjects.length === 0 ? (
          <EmptyState icon="book" title="No subjects found" />
        ) : (
          <Table>
            <thead className="border-b border-line">
              <tr>
                <th className="th">Code</th>
                <th className="th">Title</th>
                <th className="th">Grade</th>
                <th className="th">Type</th>
                <th className="th text-right">Sections</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subjects.map((s) => (
                <tr key={s.id} className="hover:bg-canvas/60">
                  <td className="td font-mono text-xs font-semibold">{s.code}</td>
                  <td className="td">
                    {s.title}
                    {s.semester && <span className="ml-2 text-xs text-muted">Sem {s.semester}</span>}
                  </td>
                  <td className="td whitespace-nowrap">
                    {s.gradeLevel.name}
                    {s.strand && <Badge tone="brand" className="ml-1.5">{s.strand.code}</Badge>}
                  </td>
                  <td className="td"><Badge tone={CATEGORY[s.category].tone}>{CATEGORY[s.category].label}</Badge></td>
                  <td className="td text-right tabular-nums">{s._count?.sections ?? 0}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      <IconButton icon="edit" label={`Edit ${s.code}`} onClick={() => open(s)} />
                      <IconButton icon="trash" tone="danger" label={`Delete ${s.code}`} disabled={!!s._count?.sections} onClick={() => confirm.ask(s)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New subject' : `Edit ${(editing as Subject | null)?.code ?? ''}`}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="subject-form" loading={save.isPending}>Save</Button>
          </>
        }
      >
        <form id="subject-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Code" required error={errors.code} hint="Unique, e.g. MATH7">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} invalid={!!errors.code} autoFocus />
          </Field>
          <Field label="Grade level" required error={errors.gradeLevelId}>
            <Select value={form.gradeLevelId} onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })} invalid={!!errors.gradeLevelId}>
              <option value="">Select…</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Title" required error={errors.title} className="sm:col-span-2">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} invalid={!!errors.title} />
          </Field>
          <Field label="Type">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SubjectCategory })}>
              <option value="CORE">Core</option>
              <option value="APPLIED">Applied</option>
              <option value="SPECIALIZED">Specialized</option>
            </Select>
          </Field>
          {level?.isSeniorHigh && (
            <>
              <Field label="Semester">
                <Select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
                  <option value="">—</option>
                  <option value="1">1st semester</option>
                  <option value="2">2nd semester</option>
                </Select>
              </Field>
              <Field label="Strand" hint="Leave empty if the subject is for all strands" className="sm:col-span-2">
                <Select value={form.strandId} onChange={(e) => setForm({ ...form, strandId: e.target.value })}>
                  <option value="">All strands</option>
                  {strands.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
                </Select>
              </Field>
            </>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title={`Delete ${confirm.target?.code}?`}
        message="This subject isn't assigned to any section."
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
