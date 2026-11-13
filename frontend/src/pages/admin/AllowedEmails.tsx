import { FormEvent, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import {
  Alert, Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Field, fieldErrors, IconButton, Input, Modal, PageLoader,
  Pagination, SearchInput, Segmented, Switch, Table, Toolbar, useConfirm,
} from '../../components/ui';
import { useApiMutation, useDebounced } from '../../hooks/useReference';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';
import { Pagination as P, Role } from '../../types';

interface Account {
  id: string;
  email: string;
  role: Role;
  isActive: boolean;
  hasSignedIn: boolean;
  createdAt: string;
  profile: { firstName: string; lastName: string; lrn?: string } | null;
}

const ROLE_TONE: Record<Role, 'brand' | 'gold' | 'info'> = { ADMIN: 'brand', TEACHER: 'gold', STUDENT: 'info' };
const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Registrar', TEACHER: 'Teacher', STUDENT: 'Student' };

export default function AllowedEmails() {
  const { user } = useAuth();
  const [role, setRole] = useState<'' | Role>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  useEffect(() => setPage(1), [q, role]);

  const list = useQuery({
    queryKey: ['admin', 'allowed-emails', { q, role, page }],
    queryFn: () =>
      api
        .get<{ emails: Account[]; counts: Partial<Record<Role, number>>; pagination: P }>('/admin/allowed-emails', { params: { page, limit: 30, role: role || undefined, search: q || undefined } })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const confirm = useConfirm<Account>();

  const add = useApiMutation((e: string) => api.post('/admin/allowed-emails', { email: e, role: 'ADMIN' }), {
    success: 'Registrar account added',
    invalidate: [['admin', 'allowed-emails']],
    onSuccess: () => { setAdding(false); setEmail(''); },
  });
  const toggle = useApiMutation((a: Account) => api.put(`/admin/allowed-emails/${a.id}`, { isActive: !a.isActive }), {
    success: (a) => `${a.email} ${a.isActive ? 'blocked' : 'allowed'}`,
    invalidate: [['admin']],
  });
  const remove = useApiMutation((a: Account) => api.delete(`/admin/allowed-emails/${a.id}`), { success: 'Removed from access list', invalidate: [['admin', 'allowed-emails']], onSuccess: confirm.close });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    add.mutate(email, { onError: (err) => setErrors(fieldErrors(err)) });
  };

  const counts = list.data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
  const pg = list.data?.pagination;

  return (
    <DashboardLayout
      title="Access list"
      subtitle="Only these Google accounts can sign in. Students and teachers are added automatically when you create their records."
      actions={<Button variant="primary" icon="plus" onClick={() => { setErrors({}); setAdding(true); }}>Add registrar</Button>}
    >
      <Card>
        <Toolbar>
          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: '', label: 'All', count: total },
              { value: Role.STUDENT, label: 'Students', count: counts.STUDENT ?? 0 },
              { value: Role.TEACHER, label: 'Teachers', count: counts.TEACHER ?? 0 },
              { value: Role.ADMIN, label: 'Registrar', count: counts.ADMIN ?? 0 },
            ]}
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search email…" />
        </Toolbar>

        {list.isLoading ? (
          <PageLoader />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : !list.data?.emails.length ? (
          <EmptyState icon="mail" title="No accounts found" />
        ) : (
          <>
            <Table>
              <thead className="border-b border-line">
                <tr>
                  <th className="th">Email</th>
                  <th className="th">Role</th>
                  <th className="th">Linked to</th>
                  <th className="th">Signed in</th>
                  <th className="th">Access</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data.emails.map((a) => (
                  <tr key={a.id} className="hover:bg-canvas/60">
                    <td className="td">
                      <p className="font-medium">{a.email}</p>
                      <p className="text-xs text-muted">Added {formatDate(a.createdAt)}</p>
                    </td>
                    <td className="td"><Badge tone={ROLE_TONE[a.role]}>{ROLE_LABEL[a.role]}</Badge></td>
                    <td className="td">{a.profile ? `${a.profile.lastName}, ${a.profile.firstName}` : <span className="text-muted">—</span>}</td>
                    <td className="td">{a.hasSignedIn ? <Badge tone="success" icon="check">Yes</Badge> : <span className="text-xs text-muted">Not yet</span>}</td>
                    <td className="td">
                      <Switch checked={a.isActive} disabled={a.id === user?.id} onChange={() => toggle.mutate(a)} label={`Allow ${a.email}`} />
                    </td>
                    <td className="td text-right">
                      <IconButton icon="trash" tone="danger" label="Remove" disabled={!!a.profile || a.id === user?.id} onClick={() => confirm.ask(a)} />
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
        open={adding}
        onClose={() => setAdding(false)}
        size="sm"
        title="Add registrar account"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="email-form" loading={add.isPending}>Add</Button>
          </>
        }
      >
        <form id="email-form" onSubmit={submit} className="space-y-4">
          <Alert tone="info">Registrar accounts have full access to student records and grades.</Alert>
          <Field label="Google account email" required error={errors.email}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} invalid={!!errors.email} autoFocus />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && remove.mutate(confirm.target)}
        loading={remove.isPending}
        title="Remove access?"
        message={<><b>{confirm.target?.email}</b> will no longer be able to sign in.</>}
        confirmLabel="Remove"
      />
    </DashboardLayout>
  );
}
