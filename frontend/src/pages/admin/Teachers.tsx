import { FormEvent, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader,
  Pagination, SearchInput, Switch, Table, Toolbar, useConfirm,
} from '../../components/ui';
import { useApiMutation, useDebounced } from '../../hooks/useReference';
import api, { assetUrl } from '../../lib/api';
import type { Pagination as P } from '../../types';

interface TeacherRow {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  department: string | null;
  photoUrl: string | null;
  user: { email: string; isActive: boolean };
  advisorySections: { id: string; name: string }[];
  assignments: { id: string; section: { name: string }; subject: { code: string } }[];
}

const DEPARTMENTS = ['English', 'Filipino', 'Mathematics', 'Science', 'Araling Panlipunan', 'MAPEH', 'TLE', 'Values Education', 'Senior High Core', 'STEM', 'ABM', 'HUMSS'];
const blank = { email: '', firstName: '', middleName: '', lastName: '', suffix: '', department: '', isActive: true };
type FormState = typeof blank;

export default function Teachers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q]);

  const list = useQuery({
    queryKey: ['admin', 'teachers', { q, page }],
    queryFn: () => api.get<{ teachers: TeacherRow[]; pagination: P }>('/admin/teachers', { params: { page, limit: 25, search: q || undefined } }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const [editing, setEditing] = useState<TeacherRow | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<TeacherRow>();

  const save = useApiMutation(
    (f: FormState) => (editing === 'new' ? api.post('/admin/teachers', f) : api.put(`/admin/teachers/${(editing as TeacherRow).id}`, f)),
    { success: editing === 'new' ? 'Teacher added' : 'Teacher updated', invalidate: [['admin']], onSuccess: () => setEditing(null) }
  );
  const toggleActive = useApiMutation((t: TeacherRow) => api.put(`/admin/teachers/${t.id}`, { isActive: !t.user.isActive }), {
    success: (t) => `${t.firstName} ${t.user.isActive ? 'deactivated' : 'reactivated'}`,
    invalidate: [['admin', 'teachers']],
  });
  const remove = useApiMutation((t: TeacherRow) => api.delete(`/admin/teachers/${t.id}`), { success: 'Teacher deleted', invalidate: [['admin']], onSuccess: confirm.close });

  const open = (t: TeacherRow | 'new') => {
    setErrors({});
    setForm(
      t === 'new'
        ? blank
        : { email: t.user.email, firstName: t.firstName, middleName: t.middleName ?? '', lastName: t.lastName, suffix: t.suffix ?? '', department: t.department ?? '', isActive: t.user.isActive }
    );
    setEditing(t);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const teachers = list.data?.teachers ?? [];
  const pg = list.data?.pagination;

  return (
    <DashboardLayout title="Teachers" subtitle="Faculty records, advisory sections and teaching loads." actions={<Button variant="primary" icon="plus" onClick={() => open('new')}>Add teacher</Button>}>
      <Card>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or department…" className="sm:w-80" />
        </Toolbar>
        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : teachers.length === 0 ? (
          <EmptyState icon="user" title="No teachers found" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Teacher</th>
                  <th className="th">Department</th>
                  <th className="th">Adviser of</th>
                  <th className="th">Classes this year</th>
                  <th className="th">Active</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-canvas/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${t.firstName} ${t.lastName}`} src={assetUrl(t.photoUrl)} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{t.lastName}, {t.firstName}</p>
                          <p className="text-xs text-muted truncate">{t.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">{t.department ?? <span className="text-muted">—</span>}</td>
                    <td className="td">{t.advisorySections.length ? t.advisorySections.map((s) => <Badge key={s.id} tone="gold" className="mr-1">{s.name}</Badge>) : <span className="text-muted">—</span>}</td>
                    <td className="td">
                      {t.assignments.length ? (
                        <span title={t.assignments.map((a) => `${a.subject.code} · ${a.section.name}`).join('\n')}>
                          <Badge tone={t.assignments.length > 6 ? 'danger' : 'neutral'}>{t.assignments.length}</Badge>
                          <span className="ml-2 text-xs text-muted">{[...new Set(t.assignments.map((a) => a.subject.code))].slice(0, 3).join(', ')}{t.assignments.length > 3 ? '…' : ''}</span>
                        </span>
                      ) : (
                        <Badge tone="warn">No load</Badge>
                      )}
                    </td>
                    <td className="td">
                      <Switch checked={t.user.isActive} onChange={() => toggleActive.mutate(t)} label={`Account active for ${t.firstName}`} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" label="Edit" onClick={() => open(t)} />
                        <IconButton icon="trash" tone="danger" label="Delete" disabled={t.assignments.length > 0 || t.advisorySections.length > 0} onClick={() => confirm.ask(t)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {pg && <Pagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onChange={setPage} />}
          </>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add teacher' : 'Edit teacher'}
        description="The email is the Google account the teacher will sign in with."
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="teacher-form" loading={save.isPending}>Save teacher</Button>
          </>
        }
      >
        <form id="teacher-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="First name" required error={errors.firstName}>
            <Input value={form.firstName} onChange={set('firstName')} invalid={!!errors.firstName} autoFocus />
          </Field>
          <Field label="Last name" required error={errors.lastName}>
            <Input value={form.lastName} onChange={set('lastName')} invalid={!!errors.lastName} />
          </Field>
          <Field label="Middle name">
            <Input value={form.middleName} onChange={set('middleName')} />
          </Field>
          <Field label="Suffix">
            <Input value={form.suffix} onChange={set('suffix')} />
          </Field>
          <Field label="Google account email" required error={errors.email} className="sm:col-span-2">
            <Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} />
          </Field>
          <Field label="Department" className="sm:col-span-2">
            <Input list="departments" value={form.department} onChange={set('department')} placeholder="Choose or type…" />
            <datalist id="departments">
              {DEPARTMENTS.map((d) => <option key={d} value={d} />)}
            </datalist>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title={`Delete ${confirm.target?.firstName} ${confirm.target?.lastName}?`}
        message="This removes the teacher and their portal access."
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
