import { FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader, Select, Textarea, useConfirm } from './ui';
import { Icon } from './Icon';
import { useApiMutation } from '../hooks/useReference';
import api from '../lib/api';
import { formatDateTime, plural } from '../lib/format';
import type { Announcement, Audience } from '../types';

interface Targets {
  sections: { id: string; name: string }[];
  gradeLevels: { id: string; name: string }[];
}

const AUDIENCE_LABEL: Record<Audience, string> = {
  ALL: 'Everyone',
  STUDENTS: 'All students',
  TEACHERS: 'All teachers',
  SECTION: 'One section',
  GRADE_LEVEL: 'One grade level',
};

const blank = { title: '', body: '', audience: 'STUDENTS' as Audience, targetId: '', isPinned: false };

export function AnnouncementsManager({ role }: { role: 'admin' | 'teacher' }) {
  const base = `/${role}/announcements`;
  const isAdmin = role === 'admin';
  const audiences: Audience[] = isAdmin ? ['ALL', 'STUDENTS', 'TEACHERS', 'GRADE_LEVEL', 'SECTION'] : ['STUDENTS', 'GRADE_LEVEL', 'SECTION'];

  const list = useQuery({
    queryKey: [role, 'announcements'],
    queryFn: () => api.get<{ announcements: Announcement[] }>(base, { params: { limit: 100 } }).then((r) => r.data.announcements),
  });
  const targets = useQuery({
    queryKey: [role, 'announcement-targets'],
    queryFn: async (): Promise<Targets> => {
      if (!isAdmin) return api.get<Targets>('/teacher/announcements/targets').then((r) => r.data);
      const [s, g] = await Promise.all([
        api.get<{ sections: { id: string; name: string }[] }>('/admin/sections', { params: { limit: 500 } }),
        api.get<{ gradeLevels: { id: string; name: string }[] }>('/admin/grade-levels'),
      ]);
      return { sections: s.data.sections, gradeLevels: g.data.gradeLevels };
    },
    staleTime: 5 * 60_000,
  });

  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<Announcement>();

  const save = useApiMutation(
    (f: typeof blank) => {
      const body = { ...f, targetId: f.audience === 'SECTION' || f.audience === 'GRADE_LEVEL' ? f.targetId || null : null };
      return editing === 'new' ? api.post(base, body) : api.put(`${base}/${(editing as Announcement).id}`, body);
    },
    { success: editing === 'new' ? 'Announcement posted' : 'Announcement updated', invalidate: [[role]], onSuccess: () => setEditing(null) }
  );
  const remove = useApiMutation((a: Announcement) => api.delete(`${base}/${a.id}`), { success: 'Announcement deleted', invalidate: [[role]], onSuccess: confirm.close });
  const pin = useApiMutation((a: Announcement) => api.put(`${base}/${a.id}`, { isPinned: !a.isPinned }), { invalidate: [[role]] });

  const open = (a: Announcement | 'new') => {
    setErrors({});
    setForm(a === 'new' ? blank : { title: a.title, body: a.body, audience: a.audience, targetId: a.targetId ?? '', isPinned: a.isPinned });
    setEditing(a);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate(form, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  const targetOptions = form.audience === 'SECTION' ? targets.data?.sections : form.audience === 'GRADE_LEVEL' ? targets.data?.gradeLevels : null;

  return (
    <>
      <div className="flex justify-end mb-4 -mt-2">
        <Button variant="primary" icon="plus" onClick={() => open('new')}>New announcement</Button>
      </div>

      {list.isLoading ? (
        <Card><PageLoader /></Card>
      ) : list.error ? (
        <Card><ErrorState error={list.error} onRetry={list.refetch} /></Card>
      ) : !list.data?.length ? (
        <Card><EmptyState icon="megaphone" title="No announcements yet" description="Post an update for students or staff." /></Card>
      ) : (
        <div className="space-y-3">
          {list.data.map((a) => (
            <Card key={a.id} className={a.isPinned ? 'border-gold-200 bg-gold-50/40' : undefined}>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {a.isPinned && <Badge tone="gold" icon="pin">Pinned</Badge>}
                    <Badge tone="info">{a.targetLabel}</Badge>
                    <span className="text-xs text-muted">
                      {a.authorName} · {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                  <h3 className="font-bold text-ink">{a.title}</h3>
                  <p className="mt-1 text-sm text-ink-soft whitespace-pre-line">{a.body}</p>
                  {a.canEdit && a.audience !== 'TEACHERS' && (
                    <p className="mt-2 text-xs text-muted inline-flex items-center gap-1">
                      <Icon name="eye" size={13} /> Read by {plural(a.readCount ?? 0, 'student')}
                    </p>
                  )}
                </div>
                {a.canEdit && (
                  <div className="flex gap-1 shrink-0">
                    {isAdmin && <IconButton icon="pin" label={a.isPinned ? 'Unpin' : 'Pin to top'} onClick={() => pin.mutate(a)} className={a.isPinned ? 'text-gold-700' : undefined} />}
                    <IconButton icon="edit" label="Edit" onClick={() => open(a)} />
                    <IconButton icon="trash" tone="danger" label="Delete" onClick={() => confirm.ask(a)} />
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New announcement' : 'Edit announcement'}
        footer={
          <>
            <Button onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="primary" type="submit" form="ann-form" loading={save.isPending}>{editing === 'new' ? 'Post' : 'Save'}</Button>
          </>
        }
      >
        <form id="ann-form" onSubmit={submit} className="space-y-4">
          <Field label="Title" required error={errors.title}>
            <Input value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} invalid={!!errors.title} autoFocus />
          </Field>
          <Field label="Message" required error={errors.body}>
            <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} invalid={!!errors.body} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Who should see this?">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as Audience, targetId: '' })}>
                {audiences.map((a) => <option key={a} value={a}>{AUDIENCE_LABEL[a]}</option>)}
              </Select>
            </Field>
            {targetOptions && (
              <Field label={form.audience === 'SECTION' ? 'Section' : 'Grade level'} required error={errors.targetId}>
                <Select value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })} invalid={!!errors.targetId}>
                  <option value="">Choose…</option>
                  {targetOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </Select>
              </Field>
            )}
          </div>
          {isAdmin && (
            <label className="flex items-center gap-3 cursor-pointer text-sm">
              <input type="checkbox" className="accent-brand-800" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
              Pin to the top of everyone's list
            </label>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title="Delete announcement?"
        message={<>“{confirm.target?.title}” will be removed for everyone.</>}
        confirmLabel="Delete"
      />
    </>
  );
}
