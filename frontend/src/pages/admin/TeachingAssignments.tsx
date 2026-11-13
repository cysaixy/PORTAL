import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Badge, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, IconButton, PageLoader, Select, Spinner, useConfirm } from '../../components/ui';
import { useAllSections, useAllSubjects, useAllTeachers, useApiMutation } from '../../hooks/useReference';
import api from '../../lib/api';
import { plural, sortName } from '../../lib/format';
import clsx from 'clsx';

interface Assignment {
  id: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  subject: { code: string; title: string };
  _count: { grades: number };
}
interface Load {
  id: string;
  name: string;
  department: string | null;
  classCount: number;
  heavyLoad: boolean;
  isActive: boolean;
}

export default function TeachingAssignments() {
  const sections = useAllSections();
  const subjects = useAllSubjects();
  const teachers = useAllTeachers();
  const [sectionId, setSectionId] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const confirm = useConfirm<Assignment>();

  useEffect(() => {
    if (!sectionId && sections.data?.length) setSectionId(sections.data[0].id);
  }, [sections.data, sectionId]);

  const section = sections.data?.find((s) => s.id === sectionId);

  const assignments = useQuery({
    queryKey: ['admin', 'assignments', sectionId],
    queryFn: () => api.get<{ assignments: Assignment[] }>('/admin/teaching-assignments', { params: { sectionId, limit: 100 } }).then((r) => r.data.assignments),
    enabled: !!sectionId,
  });
  const loads = useQuery({
    queryKey: ['admin', 'teacher-load'],
    queryFn: () => api.get<{ loads: Load[] }>('/admin/teaching-assignments/teacher-load').then((r) => r.data.loads),
  });

  // Subjects that belong to this section: same grade level, and either all-strand or matching strand
  const rows = useMemo(() => {
    if (!section || !subjects.data) return [];
    return subjects.data
      .filter((s) => s.gradeLevelId === section.gradeLevelId && (!s.strandId || s.strandId === section.strandId))
      .map((subject) => ({ subject, assignment: assignments.data?.find((a) => a.subjectId === subject.id) }));
  }, [section, subjects.data, assignments.data]);

  const invalidate = [['admin', 'assignments'], ['admin', 'teacher-load'], ['admin', 'sections'], ['admin', 'dashboard']];
  const assign = useApiMutation(
    ({ subjectId, teacherId, assignment }: { subjectId: string; teacherId: string; assignment?: Assignment }) =>
      assignment ? api.put(`/admin/teaching-assignments/${assignment.id}`, { teacherId }) : api.post('/admin/teaching-assignments', { sectionId, subjectId, teacherId }),
    { success: 'Teacher assigned', invalidate }
  );
  const unassign = useApiMutation((a: Assignment) => api.delete(`/admin/teaching-assignments/${a.id}`), { success: 'Assignment removed', invalidate, onSuccess: confirm.close });

  const onPick = (subjectId: string, teacherId: string, assignment?: Assignment) => {
    if (!teacherId || teacherId === assignment?.teacherId) return;
    setPending(subjectId);
    assign.mutate({ subjectId, teacherId, assignment }, { onSettled: () => setPending(null) });
  };

  const missing = rows.filter((r) => !r.assignment).length;
  const loadById = new Map(loads.data?.map((l) => [l.id, l]));

  return (
    <DashboardLayout title="Teaching loads" subtitle="Assign a teacher to every subject of each section for the current school year.">
      <div className="grid xl:grid-cols-[1fr_340px] gap-6 items-start">
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="sm:w-72">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} aria-label="Section">
                {sections.data?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.gradeLevel.name}{s.strand ? ` ${s.strand.code}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            {section && (
              <p className="text-xs text-muted">
                {plural(section._count.students, 'student')} · Adviser: {section.adviser ? sortName(section.adviser) : 'none'}
              </p>
            )}
          </div>

          {sections.isLoading || subjects.isLoading || assignments.isLoading ? (
            <PageLoader />
          ) : sections.error || assignments.error ? (
            <ErrorState error={sections.error ?? assignments.error} onRetry={() => { sections.refetch(); assignments.refetch(); }} />
          ) : !sections.data?.length ? (
            <EmptyState icon="users" title="No sections this school year" description="Create sections first." />
          ) : rows.length === 0 ? (
            <EmptyState icon="book" title="No subjects for this grade level" description="Add subjects for this grade in the Subjects page." />
          ) : (
            <>
              {missing > 0 && (
                <div className="mb-4">
                  <Alert tone="warn">{plural(missing, 'subject')} in {section?.name} still need a teacher.</Alert>
                </div>
              )}
              <ul className="divide-y divide-line border border-line rounded-xl">
                {rows.map(({ subject, assignment }) => (
                  <li key={subject.id} className={clsx('flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 py-3', !assignment && 'bg-warn-50/40')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{subject.code}</span>
                        {subject.strand && <Badge tone="brand">{subject.strand.code}</Badge>}
                      </div>
                      <p className="text-sm text-ink-soft truncate">{subject.title}</p>
                    </div>
                    <div className="flex items-center gap-2 sm:w-80">
                      <div className="flex-1">
                        <Select
                          value={assignment?.teacherId ?? ''}
                          onChange={(e) => onPick(subject.id, e.target.value, assignment)}
                          disabled={pending === subject.id}
                          aria-label={`Teacher for ${subject.code}`}
                          invalid={!assignment}
                        >
                          {!assignment && <option value="">Choose a teacher…</option>}
                          {teachers.data
                            ?.filter((t) => t.user.isActive || t.id === assignment?.teacherId)
                            .map((t) => {
                              const l = loadById.get(t.id);
                              return (
                                <option key={t.id} value={t.id}>
                                  {sortName(t)}{t.department ? ` · ${t.department}` : ''}{l ? ` (${l.classCount})` : ''}
                                </option>
                              );
                            })}
                        </Select>
                      </div>
                      {pending === subject.id ? (
                        <span className="w-8 flex justify-center text-muted"><Spinner size={16} /></span>
                      ) : (
                        <IconButton
                          icon="trash"
                          tone="danger"
                          label="Remove assignment"
                          disabled={!assignment || assignment._count.grades > 0}
                          title={assignment?._count.grades ? 'Grades already encoded — reassign instead' : 'Remove assignment'}
                          onClick={() => assignment && confirm.ask(assignment)}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="Teacher loads" description="Classes this school year · more than 6 is flagged" />
          {loads.isLoading ? (
            <PageLoader rows={6} />
          ) : (
            <ul className="divide-y divide-line -my-2 max-h-[640px] overflow-y-auto">
              {loads.data
                ?.filter((l) => l.isActive)
                .sort((a, b) => b.classCount - a.classCount)
                .map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{l.name}</p>
                      <p className="text-xs text-muted truncate">{l.department ?? 'No department'}</p>
                    </div>
                    <Badge tone={l.heavyLoad ? 'danger' : l.classCount === 0 ? 'warn' : 'neutral'}>{plural(l.classCount, 'class', 'classes')}</Badge>
                  </li>
                ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onClose={confirm.close}
        onConfirm={() => confirm.target && unassign.mutate(confirm.target)}
        loading={unassign.isPending}
        title={`Remove ${confirm.target?.subject.code} from ${section?.name}?`}
        message="The section will no longer have this subject. You can assign it again later."
        confirmLabel="Remove"
      />
    </DashboardLayout>
  );
}
