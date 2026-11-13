import { FormEvent, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader, Table, useConfirm } from '../../components/ui';
import { useApiMutation, useSchoolYears } from '../../hooks/useReference';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { formatDate, toDateInput } from '../../lib/format';
import type { SchoolYear } from '../../types';

interface FormState {
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

function nextLabel(years: SchoolYear[]) {
  const latest = years.map((y) => parseInt(y.label.slice(0, 4), 10)).filter(Boolean).sort((a, b) => b - a)[0];
  const start = latest ? latest + 1 : new Date().getFullYear();
  return { label: `${start}-${start + 1}`, startDate: `${start}-06-15`, endDate: `${start + 1}-03-31` };
}

export default function SchoolYears() {
  const { refreshUser } = useAuth();
  const { data: years = [], isLoading, error, refetch } = useSchoolYears();
  const [editing, setEditing] = useState<SchoolYear | 'new' | null>(null);
  const [form, setForm] = useState<FormState>({ label: '', startDate: '', endDate: '', isCurrent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirmDelete = useConfirm<SchoolYear>();
  const confirmCurrent = useConfirm<SchoolYear>();

  const invalidate = [['admin']];
  const save = useApiMutation(
    (f: FormState) => (editing === 'new' ? api.post('/admin/school-years', f) : api.put(`/admin/school-years/${(editing as SchoolYear).id}`, f)),
    { success: editing === 'new' ? 'School year created' : 'School year updated', invalidate, onSuccess: () => { setEditing(null); refreshUser(); } }
  );
  const setCurrent = useApiMutation((y: SchoolYear) => api.post(`/admin/school-years/${y.id}/set-current`), {
    success: (y) => `${y.label} is now the current school year`,
    invalidate,
    onSuccess: () => { confirmCurrent.close(); refreshUser(); },
  });
  const remove = useApiMutation((y: SchoolYear) => api.delete(`/admin/school-years/${y.id}`), {
    success: 'School year deleted',
    invalidate,
    onSuccess: confirmDelete.close,
  });

  const openNew = () => {
    setErrors({});
    setForm({ ...nextLabel(years), isCurrent: false });
    setEditing('new');
  };
  const openEdit = (y: SchoolYear) => {
    setErrors({});
    setForm({ label: y.label, startDate: toDateInput(y.startDate), endDate: toDateInput(y.endDate), isCurrent: y.isCurrent });
    setEditing(y);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  return (
    <DashboardLayout
      title="School years"
      subtitle="Sections, enrollment and grades are organised per school year."
      actions={<Button variant="primary" icon="plus" onClick={openNew}>New school year</Button>}
    >
      <Card>
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : years.length === 0 ? (
          <EmptyState icon="calendar" title="No school years yet" action={<Button variant="primary" icon="plus" onClick={openNew}>Create the first one</Button>} />
        ) : (
          <Table>
            <thead className="border-b border-line">
              <tr>
                <th className="th">School year</th>
                <th className="th">Dates</th>
                <th className="th text-right">Sections</th>
                <th className="th text-right">Enrolled</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {years.map((y) => (
                <tr key={y.id} className="hover:bg-canvas/60">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">SY {y.label}</span>
                      {y.isCurrent && <Badge tone="success" icon="check">Current</Badge>}
                    </div>
                  </td>
                  <td className="td text-ink-soft whitespace-nowrap">
                    {formatDate(y.startDate)} – {formatDate(y.endDate)}
                  </td>
                  <td className="td text-right tabular-nums">{y.sectionCount ?? 0}</td>
                  <td className="td text-right tabular-nums">{y.studentCount ?? 0}</td>
                  <td className="td">
                    <div className="flex justify-end gap-1">
                      {!y.isCurrent && (
                        <Button size="sm" variant="ghost" onClick={() => confirmCurrent.ask(y)}>
                          Make current
                        </Button>
                      )}
                      <IconButton icon="edit" label={`Edit ${y.label}`} onClick={() => openEdit(y)} />
                      <IconButton icon="trash" tone="danger" label={`Delete ${y.label}`} disabled={y.isCurrent} onClick={() => confirmDelete.ask(y)} />
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
        title={editing === 'new' ? 'New school year' : `Edit SY ${(editing as SchoolYear | null)?.label ?? ''}`}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="sy-form" loading={save.isPending}>
              Save
            </Button>
          </>
        }
      >
        <form id="sy-form" onSubmit={submit} className="space-y-4">
          <Field label="Label" required error={errors.label} hint="Format: 2026-2027">
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} invalid={!!errors.label} placeholder="2026-2027" autoFocus />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Opening day" required error={errors.startDate}>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} invalid={!!errors.startDate} />
            </Field>
            <Field label="Last day" required error={errors.endDate}>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} invalid={!!errors.endDate} />
            </Field>
          </div>
          {editing === 'new' && (
            <label className="flex items-start gap-3 rounded-xl border border-line p-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-brand-800" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
              <span className="text-sm">
                <span className="font-semibold">Make this the current school year</span>
                <span className="block text-xs text-muted">Teachers and students will immediately see this year's sections and classes.</span>
              </span>
            </label>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmCurrent.open}
        onClose={confirmCurrent.close}
        onConfirm={() => confirmCurrent.target && setCurrent.mutate(confirmCurrent.target)}
        loading={setCurrent.isPending}
        tone="primary"
        title={`Switch to SY ${confirmCurrent.target?.label}?`}
        message="Everyone's dashboards, class lists and report cards will switch to this school year. Grades from other years are kept."
        confirmLabel="Make current"
      />
      <ConfirmDialog
        open={confirmDelete.open}
        onClose={confirmDelete.close}
        onConfirm={() => confirmDelete.target && remove.mutate(confirmDelete.target)}
        loading={remove.isPending}
        title={`Delete SY ${confirmDelete.target?.label}?`}
        message="Only school years with no sections can be deleted."
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
