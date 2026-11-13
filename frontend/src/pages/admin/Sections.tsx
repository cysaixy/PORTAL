import { FormEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader,
  Progress, SearchInput, Segmented, Select, Table, Toolbar, useConfirm,
} from '../../components/ui';
import { useAllTeachers, useApiMutation, useDebounced, useGradeLevels, useSchoolYears, useStrands } from '../../hooks/useReference';
import api from '../../lib/api';
import { plural, sortName } from '../../lib/format';
import type { Section } from '../../types';

interface SectionDetail extends Omit<Section, '_count'> {
  students: { id: string; student: { id: string; lrn: string; firstName: string; lastName: string; sex: string } }[];
  subjects: { id: string; subject: { code: string; title: string }; teacher: { firstName: string; lastName: string } }[];
}

const blank = { name: '', gradeLevelId: '', strandId: '', adviserId: '', schoolYearId: '', capacity: 40 };

export default function Sections() {
  const { data: years = [] } = useSchoolYears();
  const { data: levels = [] } = useGradeLevels();
  const { data: strands = [] } = useStrands();
  const { data: teachers = [] } = useAllTeachers();
  const currentYear = years.find((y) => y.isCurrent);

  const [yearId, setYearId] = useState('');
  const [grade, setGrade] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const activeYear = yearId || currentYear?.id || '';

  const list = useQuery({
    queryKey: ['admin', 'sections', { activeYear, grade, q }],
    queryFn: () =>
      api
        .get<{ sections: Section[] }>('/admin/sections', { params: { limit: 500, schoolYearId: activeYear || undefined, gradeLevelId: grade || undefined, search: q || undefined } })
        .then((r) => r.data.sections),
    enabled: years.length > 0,
  });

  const [editing, setEditing] = useState<Section | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<string | null>(null);
  const confirm = useConfirm<Section>();

  const selectedLevel = levels.find((l) => l.id === form.gradeLevelId);
  const save = useApiMutation(
    (f: typeof blank) => {
      const body = { ...f, strandId: selectedLevel?.isSeniorHigh ? f.strandId || null : null, adviserId: f.adviserId || null };
      return editing === 'new' ? api.post('/admin/sections', body) : api.put(`/admin/sections/${(editing as Section).id}`, body);
    },
    { success: 'Section saved', invalidate: [['admin']], onSuccess: () => setEditing(null) }
  );
  const remove = useApiMutation((s: Section) => api.delete(`/admin/sections/${s.id}`), { success: 'Section deleted', invalidate: [['admin']], onSuccess: confirm.close });

  const open = (s: Section | 'new') => {
    setErrors({});
    setForm(
      s === 'new'
        ? { ...blank, schoolYearId: activeYear, gradeLevelId: grade }
        : { name: s.name, gradeLevelId: s.gradeLevelId, strandId: s.strandId ?? '', adviserId: s.adviserId ?? '', schoolYearId: s.schoolYearId, capacity: s.capacity }
    );
    setEditing(s);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  const sections = list.data ?? [];
  const totalStudents = sections.reduce((n, s) => n + s._count.students, 0);

  return (
    <DashboardLayout
      title="Sections"
      subtitle={currentYear ? `${plural(sections.length, 'section')} · ${plural(totalStudents, 'student')} enrolled` : undefined}
      actions={<Button variant="primary" icon="plus" onClick={() => open('new')}>New section</Button>}
    >
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search section or adviser…" />
          <div className="w-40">
            <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade level">
              <option value="">All grades</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </div>
          <div className="w-44">
            <Select value={activeYear} onChange={(e) => setYearId(e.target.value)} aria-label="School year">
              {years.map((y) => <option key={y.id} value={y.id}>SY {y.label}{y.isCurrent ? ' (current)' : ''}</option>)}
            </Select>
          </div>
        </Toolbar>

        {list.isLoading || !years.length ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : sections.length === 0 ? (
          <EmptyState icon="users" title="No sections found" description="Try a different filter, or create a section for this school year." />
        ) : (
          <Table>
            <thead className="border-b border-line">
              <tr>
                <th className="th">Section</th>
                <th className="th">Adviser</th>
                <th className="th w-48">Enrollment</th>
                <th className="th text-right">Subjects</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sections.map((s) => (
                <tr key={s.id} className="hover:bg-canvas/60 cursor-pointer" onClick={() => setViewing(s.id)}>
                  <td className="td">
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted flex items-center gap-1.5">
                      {s.gradeLevel.name}
                      {s.strand && <Badge tone="brand">{s.strand.code}</Badge>}
                    </div>
                  </td>
                  <td className="td">{s.adviser ? sortName(s.adviser) : <Badge tone="warn">No adviser</Badge>}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <Progress value={s._count.students} max={s.capacity} tone={s._count.students >= s.capacity ? 'gold' : 'brand'} className="w-24" />
                      <span className="text-xs tabular-nums text-muted">
                        {s._count.students}/{s.capacity}
                      </span>
                    </div>
                  </td>
                  <td className="td text-right tabular-nums">{s._count.subjects || <Badge tone="warn">None</Badge>}</td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <IconButton icon="edit" label={`Edit ${s.name}`} onClick={() => open(s)} />
                      <IconButton icon="trash" tone="danger" label={`Delete ${s.name}`} onClick={() => confirm.ask(s)} />
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
        title={editing === 'new' ? 'New section' : `Edit ${(editing as Section | null)?.name ?? ''}`}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="section-form" loading={save.isPending}>Save</Button>
          </>
        }
      >
        <form id="section-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Section name" required error={errors.name} className="sm:col-span-2" hint="e.g. 7-Rizal or 11-STEM-A">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} invalid={!!errors.name} autoFocus />
          </Field>
          <Field label="Grade level" required error={errors.gradeLevelId}>
            <Select value={form.gradeLevelId} onChange={(e) => setForm({ ...form, gradeLevelId: e.target.value })} invalid={!!errors.gradeLevelId}>
              <option value="">Select…</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
          </Field>
          <Field label="Strand" hint={selectedLevel && !selectedLevel.isSeniorHigh ? 'Only for Grades 11–12' : undefined}>
            <Select value={form.strandId} disabled={!selectedLevel?.isSeniorHigh} onChange={(e) => setForm({ ...form, strandId: e.target.value })}>
              <option value="">None</option>
              {strands.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </Select>
          </Field>
          <Field label="Adviser" error={errors.adviserId}>
            <Select value={form.adviserId} onChange={(e) => setForm({ ...form, adviserId: e.target.value })}>
              <option value="">No adviser yet</option>
              {teachers.filter((t) => t.user.isActive).map((t) => <option key={t.id} value={t.id}>{sortName(t)}{t.department ? ` · ${t.department}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Capacity" required error={errors.capacity}>
            <Input type="number" min={1} max={100} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </Field>
          <Field label="School year" required error={errors.schoolYearId} className="sm:col-span-2">
            <Select value={form.schoolYearId} onChange={(e) => setForm({ ...form, schoolYearId: e.target.value })}>
              {years.map((y) => <option key={y.id} value={y.id}>SY {y.label}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title={`Delete ${confirm.target?.name}?`}
        message="Sections can only be deleted when they have no students and no subjects assigned."
        confirmLabel="Delete"
      />

      {viewing && <SectionDrawer id={viewing} onClose={() => setViewing(null)} />}
    </DashboardLayout>
  );
}

function SectionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const [tab, setTab] = useState<'students' | 'subjects'>('students');
  const [adding, setAdding] = useState(false);
  const confirm = useConfirm<{ id: string; name: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'section', id],
    queryFn: () => api.get<{ section: SectionDetail }>(`/admin/sections/${id}`).then((r) => r.data.section),
  });
  const drop = useApiMutation((s: { id: string }) => api.delete(`/admin/sections/${id}/students/${s.id}`), {
    success: 'Student removed from section',
    invalidate: [['admin']],
    onSuccess: confirm.close,
  });

  const boys = data?.students.filter((s) => s.student.sex === 'M').length ?? 0;

  return (
    <Drawer
      open
      onClose={onClose}
      title={data?.name ?? 'Section'}
      description={data && `${data.gradeLevel.name}${data.strand ? ` · ${data.strand.code}` : ''} · SY ${data.schoolYear.label} · Adviser: ${data.adviser ? sortName(data.adviser) : 'none'}`}
    >
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : data ? (
        <>
          <div className="flex items-center justify-between gap-3 mb-4">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'students', label: 'Students', count: data.students.length },
                { value: 'subjects', label: 'Subjects', count: data.subjects.length },
              ]}
            />
            {tab === 'students' && (
              <Button size="sm" variant="primary" icon="plus" onClick={() => setAdding(true)} disabled={data.students.length >= data.capacity}>
                Enroll students
              </Button>
            )}
          </div>

          {tab === 'students' ? (
            data.students.length === 0 ? (
              <EmptyState icon="graduation" title="No students yet" description="Enroll students who aren't in a section this school year." />
            ) : (
              <>
                <p className="text-xs text-muted mb-2">
                  {boys} male · {data.students.length - boys} female · {data.capacity - data.students.length} seats left
                </p>
                <ul className="divide-y divide-line border border-line rounded-xl">
                  {data.students.map((e, i) => (
                    <li key={e.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="w-6 text-xs text-muted tabular-nums">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{sortName(e.student)}</p>
                        <p className="text-xs text-muted">LRN {e.student.lrn}</p>
                      </div>
                      <Badge tone={e.student.sex === 'M' ? 'info' : 'brand'}>{e.student.sex}</Badge>
                      <IconButton icon="x" tone="danger" label="Remove from section" onClick={() => confirm.ask({ id: e.student.id, name: sortName(e.student) })} />
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : data.subjects.length === 0 ? (
            <EmptyState icon="book" title="No subjects assigned" description="Assign subjects and teachers in Teaching loads." />
          ) : (
            <ul className="divide-y divide-line border border-line rounded-xl">
              {data.subjects.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Badge tone="neutral" className="min-w-[84px] justify-center">{s.subject.code}</Badge>
                  <p className="flex-1 text-sm truncate">{s.subject.title}</p>
                  <p className="text-xs text-muted">{s.teacher.firstName} {s.teacher.lastName}</p>
                </li>
              ))}
            </ul>
          )}

          {adding && <EnrollModal sectionId={id} seatsLeft={data.capacity - data.students.length} onClose={() => setAdding(false)} />}
          <ConfirmDialog
            open={confirm.open}
            onClose={confirm.close}
            onConfirm={() => confirm.target && drop.mutate(confirm.target)}
            loading={drop.isPending}
            title="Remove student from section?"
            message={<>Remove <b>{confirm.target?.name}</b> from {data.name}? Students who already have grades in this section can't be removed.</>}
            confirmLabel="Remove"
          />
        </>
      ) : null}
    </Drawer>
  );
}

function EnrollModal({ sectionId, seatsLeft, onClose }: { sectionId: string; seatsLeft: number; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'students', 'unassigned'],
    queryFn: () =>
      api
        .get<{ students: { id: string; lrn: string; firstName: string; lastName: string; user: { isActive: boolean } }[] }>('/admin/students', { params: { unassigned: 1, status: 'active', limit: 500 } })
        .then((r) => r.data.students),
  });
  const enroll = useApiMutation(() => api.post(`/admin/sections/${sectionId}/students`, { studentIds: [...picked] }), {
    success: () => `Enrolled ${plural(picked.size, 'student')}`,
    invalidate: [['admin']],
    onSuccess: onClose,
  });

  const filtered = useMemo(
    () => (data ?? []).filter((s) => `${s.lastName} ${s.firstName} ${s.lrn}`.toLowerCase().includes(search.toLowerCase())),
    [data, search]
  );
  const toggle = (id: string) =>
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.size < seatsLeft && n.add(id);
      return n;
    });

  return (
    <Modal
      open
      onClose={onClose}
      title="Enroll students"
      description={`Showing active students not in any section this school year · ${seatsLeft} seat(s) left`}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!picked.size} loading={enroll.isPending} onClick={() => enroll.mutate(undefined)}>
            Enroll {picked.size || ''}
          </Button>
        </>
      }
    >
      <SearchInput value={search} onChange={setSearch} placeholder="Search name or LRN…" className="sm:w-full mb-3" />
      {isLoading ? (
        <PageLoader rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="checkCircle" title="Everyone is enrolled" description="There are no unassigned students matching your search." />
      ) : (
        <ul className="max-h-80 overflow-y-auto divide-y divide-line border border-line rounded-xl">
          {filtered.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-canvas/60">
                <input type="checkbox" className="accent-brand-800" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                <span className="flex-1 text-sm">{sortName(s)}</span>
                <span className="text-xs text-muted tabular-nums">{s.lrn}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
