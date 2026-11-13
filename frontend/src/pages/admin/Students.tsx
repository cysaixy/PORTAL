import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader,
  Pagination, SearchInput, Segmented, Select, Switch, Table, Toolbar, useConfirm,
} from '../../components/ui';
import { useAllSections, useApiMutation, useDebounced, useGradeLevels } from '../../hooks/useReference';
import api, { assetUrl } from '../../lib/api';
import { toDateInput } from '../../lib/format';
import type { Pagination as P, Section } from '../../types';

interface StudentRow {
  id: string;
  lrn: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix: string | null;
  birthdate: string;
  sex: 'M' | 'F';
  guardianName: string;
  guardianContact: string;
  guardianEmail: string | null;
  address: string;
  photoUrl: string | null;
  user: { email: string; isActive: boolean };
  currentSection: (Section & { strand: { code: string } | null }) | null;
}

const blank = {
  lrn: '', email: '', firstName: '', middleName: '', lastName: '', suffix: '', birthdate: '', sex: 'M' as 'M' | 'F',
  guardianName: '', guardianContact: '', guardianEmail: '', address: '', sectionId: '', isActive: true,
};
type FormState = typeof blank;

export default function Students() {
  const [params, setParams] = useSearchParams();
  const filter = (params.get('filter') as 'all' | 'unassigned' | 'inactive') || 'all';
  const [search, setSearch] = useState('');
  const [grade, setGrade] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data: levels = [] } = useGradeLevels();
  const { data: sections = [] } = useAllSections();

  useEffect(() => setPage(1), [q, grade, filter]);

  const list = useQuery({
    queryKey: ['admin', 'students', { q, grade, filter, page }],
    queryFn: () =>
      api
        .get<{ students: StudentRow[]; pagination: P }>('/admin/students', {
          params: {
            page,
            limit: 25,
            search: q || undefined,
            gradeLevelId: grade || undefined,
            unassigned: filter === 'unassigned' ? 1 : undefined,
            status: filter === 'inactive' ? 'inactive' : undefined,
          },
        })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const [editing, setEditing] = useState<StudentRow | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<StudentRow>();

  const save = useApiMutation(
    (f: FormState) => {
      if (editing === 'new') return api.post('/admin/students', { ...f, sectionId: f.sectionId || null });
      const { sectionId: _ignored, ...rest } = f;
      return api.put(`/admin/students/${(editing as StudentRow).id}`, rest);
    },
    { success: editing === 'new' ? 'Student added' : 'Student updated', invalidate: [['admin']], onSuccess: () => setEditing(null) }
  );
  const toggleActive = useApiMutation((s: StudentRow) => api.put(`/admin/students/${s.id}`, { isActive: !s.user.isActive }), {
    success: (s) => `${s.firstName} ${s.user.isActive ? 'deactivated' : 'reactivated'}`,
    invalidate: [['admin', 'students']],
  });
  const remove = useApiMutation((s: StudentRow) => api.delete(`/admin/students/${s.id}`), { success: 'Student deleted', invalidate: [['admin']], onSuccess: confirm.close });

  const open = (s: StudentRow | 'new') => {
    setErrors({});
    setForm(
      s === 'new'
        ? blank
        : {
            lrn: s.lrn, email: s.user.email, firstName: s.firstName, middleName: s.middleName ?? '', lastName: s.lastName, suffix: s.suffix ?? '',
            birthdate: toDateInput(s.birthdate), sex: s.sex, guardianName: s.guardianName, guardianContact: s.guardianContact,
            guardianEmail: s.guardianEmail ?? '', address: s.address, sectionId: s.currentSection?.id ?? '', isActive: s.user.isActive,
          }
    );
    setEditing(s);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };
  const set = (k: keyof FormState) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  const students = list.data?.students ?? [];
  const pg = list.data?.pagination;

  return (
    <DashboardLayout title="Students" subtitle="Student records and their access to the portal." actions={<Button variant="primary" icon="plus" onClick={() => open('new')}>Add student</Button>}>
      <Card>
        <Toolbar>
          <Segmented
            value={filter}
            onChange={(v) => setParams(v === 'all' ? {} : { filter: v })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'unassigned', label: 'Not enrolled' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or LRN…" />
          {filter !== 'unassigned' && (
            <div className="w-40">
              <Select value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="Grade level">
                <option value="">All grades</option>
                {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
            </div>
          )}
        </Toolbar>

        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : students.length === 0 ? (
          <EmptyState
            icon="graduation"
            title={filter === 'unassigned' ? 'Everyone is enrolled' : 'No students found'}
            description={filter === 'unassigned' ? 'All active students have a section this school year.' : 'Try another search or filter.'}
          />
        ) : (
          <>
            <Table>
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">LRN</th>
                  <th className="th">Section</th>
                  <th className="th">Guardian</th>
                  <th className="th">Active</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className={list.isFetching ? 'opacity-60 divide-y divide-line' : 'divide-y divide-line'}>
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${s.firstName} ${s.lastName}`} src={assetUrl(s.photoUrl)} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{s.lastName}, {s.firstName}{s.suffix ? ` ${s.suffix}` : ''}</p>
                          <p className="text-xs text-muted truncate">{s.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td font-mono text-xs">{s.lrn}</td>
                    <td className="td whitespace-nowrap">
                      {s.currentSection ? (
                        <>
                          {s.currentSection.name}
                          <span className="block text-xs text-muted">{s.currentSection.gradeLevel.name}</span>
                        </>
                      ) : (
                        <Badge tone="warn">Not enrolled</Badge>
                      )}
                    </td>
                    <td className="td">
                      <p className="truncate max-w-[180px]">{s.guardianName}</p>
                      <p className="text-xs text-muted">{s.guardianContact}</p>
                    </td>
                    <td className="td">
                      <Switch checked={s.user.isActive} onChange={() => toggleActive.mutate(s)} label={`Account active for ${s.firstName}`} />
                    </td>
                    <td className="td">
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" label="Edit" onClick={() => open(s)} />
                        <IconButton icon="trash" tone="danger" label="Delete" onClick={() => confirm.ask(s)} />
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
        size="lg"
        title={editing === 'new' ? 'Add student' : 'Edit student'}
        description="The email is the Google account the student will sign in with."
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="student-form" loading={save.isPending}>Save student</Button>
          </>
        }
      >
        <form id="student-form" onSubmit={submit} className="space-y-6">
          <fieldset className="grid sm:grid-cols-6 gap-4">
            <legend className="sm:col-span-6 text-xs font-bold uppercase tracking-wider text-muted mb-1">Identity</legend>
            <Field label="First name" required error={errors.firstName} className="sm:col-span-2">
              <Input value={form.firstName} onChange={set('firstName')} invalid={!!errors.firstName} autoFocus />
            </Field>
            <Field label="Middle name" className="sm:col-span-2">
              <Input value={form.middleName} onChange={set('middleName')} />
            </Field>
            <Field label="Last name" required error={errors.lastName} className="sm:col-span-2">
              <Input value={form.lastName} onChange={set('lastName')} invalid={!!errors.lastName} />
            </Field>
            <Field label="Suffix" className="sm:col-span-1">
              <Input value={form.suffix} onChange={set('suffix')} placeholder="Jr." />
            </Field>
            <Field label="Sex" required className="sm:col-span-1">
              <Select value={form.sex} onChange={set('sex')}>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </Select>
            </Field>
            <Field label="Birthdate" required error={errors.birthdate} className="sm:col-span-2">
              <Input type="date" value={form.birthdate} onChange={set('birthdate')} invalid={!!errors.birthdate} />
            </Field>
            <Field label="LRN" required error={errors.lrn} hint="12-digit Learner Reference Number" className="sm:col-span-2">
              <Input inputMode="numeric" maxLength={12} value={form.lrn} onChange={(e) => setForm({ ...form, lrn: e.target.value.replace(/\D/g, '') })} invalid={!!errors.lrn} />
            </Field>
          </fieldset>

          <fieldset className="grid sm:grid-cols-2 gap-4">
            <legend className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-muted mb-1">Account & enrollment</legend>
            <Field label="Google account email" required error={errors.email}>
              <Input type="email" value={form.email} onChange={set('email')} invalid={!!errors.email} />
            </Field>
            {editing === 'new' ? (
              <Field label="Section (current school year)" hint="Optional — you can enroll later from Sections">
                <Select value={form.sectionId} onChange={set('sectionId')}>
                  <option value="">Not yet</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id} disabled={s._count.students >= s.capacity}>
                      {s.name} ({s._count.students}/{s.capacity})
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Portal access">
                <label className="flex h-10 items-center gap-3">
                  <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Account active" />
                  <span className="text-sm">{form.isActive ? 'Can sign in' : 'Blocked from signing in'}</span>
                </label>
              </Field>
            )}
          </fieldset>

          <fieldset className="grid sm:grid-cols-2 gap-4">
            <legend className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-muted mb-1">Guardian & address</legend>
            <Field label="Guardian name" required error={errors.guardianName}>
              <Input value={form.guardianName} onChange={set('guardianName')} invalid={!!errors.guardianName} />
            </Field>
            <Field label="Guardian contact" required error={errors.guardianContact}>
              <Input inputMode="tel" value={form.guardianContact} onChange={set('guardianContact')} placeholder="09XX XXX XXXX" invalid={!!errors.guardianContact} />
            </Field>
            <Field label="Guardian email" error={errors.guardianEmail}>
              <Input type="email" value={form.guardianEmail} onChange={set('guardianEmail')} invalid={!!errors.guardianEmail} />
            </Field>
            <Field label="Home address" required error={errors.address}>
              <Input value={form.address} onChange={set('address')} invalid={!!errors.address} />
            </Field>
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title={`Delete ${confirm.target?.firstName} ${confirm.target?.lastName}?`}
        message="This removes the student and their portal access. Students with recorded grades can't be deleted — deactivate them instead."
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
