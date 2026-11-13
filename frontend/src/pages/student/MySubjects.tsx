import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Avatar, Badge, Card, EmptyState, ErrorState, PageLoader } from '../../components/ui';
import api from '../../lib/api';
import type { SectionSummary } from '../../hooks/useStudent';

interface SubjectsData {
  section: SectionSummary | null;
  subjects: { id: string; code: string; title: string; category: string; semester: number | null; units: number | null; teacher: { name: string; department: string | null } }[];
}

const CAT: Record<string, 'info' | 'gold' | 'brand'> = { CORE: 'info', APPLIED: 'gold', SPECIALIZED: 'brand' };

export default function MySubjects() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'subjects'],
    queryFn: () => api.get<SubjectsData>('/student/subjects').then((r) => r.data),
  });

  return (
    <DashboardLayout title="My subjects" subtitle={data?.section ? `${data.section.name} · ${data.section.gradeLevel}${data.section.strand ? ` ${data.section.strand}` : ''}` : undefined}>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.subjects.length ? (
        <Card><EmptyState icon="book" title="No subjects yet" description="Your subjects appear once you're enrolled and your section's classes are set up." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.subjects.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-brand-800">{s.code}</span>
                <Badge tone={CAT[s.category] ?? 'neutral'}>{s.category.charAt(0) + s.category.slice(1).toLowerCase()}</Badge>
              </div>
              <h3 className="mt-1 font-bold text-ink">{s.title}</h3>
              {s.semester && <p className="text-xs text-muted">Semester {s.semester}</p>}
              <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                <Avatar name={s.teacher.name} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.teacher.name}</p>
                  <p className="text-xs text-muted truncate">{s.teacher.department ?? 'Teacher'}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
