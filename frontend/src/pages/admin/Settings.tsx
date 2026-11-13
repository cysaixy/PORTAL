import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Button, Card, CardHeader, ErrorState, Field, Input, PageLoader, Segmented } from '../../components/ui';
import { useApiMutation } from '../../hooks/useReference';
import api from '../../lib/api';

type Settings = Partial<Record<'passing_score' | 'school_name' | 'school_address' | 'current_quarter', string>>;

export default function SettingsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.get<{ settings: Settings }>('/admin/settings').then((r) => r.data.settings),
  });
  const [form, setForm] = useState<Settings>({});
  useEffect(() => {
    if (data) setForm({ passing_score: '75', current_quarter: '1', school_name: 'Lyceum of Alcala', school_address: 'Alcala, Pangasinan', ...data });
  }, [data]);

  const save = useApiMutation(
    async (changes: [string, string][]) => {
      for (const [key, value] of changes) await api.put(`/admin/settings/${key}`, { value });
    },
    { success: 'Settings saved', invalidate: [['admin'], ['teacher'], ['student']] }
  );

  const changed = Object.entries(form).filter(([k, v]) => v !== undefined && v !== (data as Settings | undefined)?.[k as keyof Settings]) as [string, string][];
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (changed.length) save.mutate(changed);
  };

  return (
    <DashboardLayout title="Settings" subtitle="School-wide values used across the portal.">
      {isLoading ? (
        <Card><PageLoader rows={4} /></Card>
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : (
        <form onSubmit={submit} className="space-y-6 max-w-3xl">
          <Card>
            <CardHeader title="Grading period" description="Teachers' dashboards and the encoding screen open on this quarter by default." />
            <Segmented
              value={form.current_quarter ?? '1'}
              onChange={(v) => setForm({ ...form, current_quarter: v })}
              options={['1', '2', '3', '4'].map((q) => ({ value: q, label: `Quarter ${q}` }))}
            />
          </Card>

          <Card>
            <CardHeader title="Passing grade" description="Grades below this are marked FAILED and highlighted for advisers." />
            <div className="grid sm:grid-cols-2 gap-4 items-start">
              <Field label="Passing score" hint="DepEd standard is 75">
                <Input type="number" min={60} max={100} value={form.passing_score ?? ''} onChange={(e) => setForm({ ...form, passing_score: e.target.value })} />
              </Field>
              <Alert tone="info">Changing this affects remarks on new grades and report cards immediately.</Alert>
            </div>
          </Card>

          <Card>
            <CardHeader title="School details" description="Printed on report cards." />
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="School name">
                <Input value={form.school_name ?? ''} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
              </Field>
              <Field label="Address">
                <Input value={form.school_address ?? ''} onChange={(e) => setForm({ ...form, school_address: e.target.value })} />
              </Field>
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button disabled={!changed.length} onClick={() => data && setForm({ ...form, ...data })}>Reset</Button>
            <Button variant="primary" type="submit" icon="save" disabled={!changed.length} loading={save.isPending}>Save changes</Button>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
}
