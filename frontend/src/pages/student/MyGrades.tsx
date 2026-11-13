import clsx from 'clsx';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Badge, Card, EmptyState, ErrorState, PageLoader, StatTile } from '../../components/ui';
import { descriptor, useStudentGrades } from '../../hooks/useStudent';
import { score } from '../../lib/format';

export default function MyGrades() {
  const { data, isLoading, error, refetch } = useStudentGrades();
  const passing = data?.passingScore ?? 75;
  const cell = (v: number | null | undefined) => (
    <span className={clsx('tabular-nums', v !== null && v !== undefined && v < passing && 'text-danger-600 font-semibold')}>{score(v)}</span>
  );

  return (
    <DashboardLayout
      title="My grades"
      subtitle={data?.section ? `${data.section.name} · SY ${data.section.schoolYear}` : 'Quarterly grades released by your teachers'}
    >
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : !data?.section ? (
        <Card><EmptyState icon="graduation" title="Not enrolled yet" description="Your grades will appear once you're enrolled in a section." /></Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4].map((q) => (
              <StatTile key={q} label={`Quarter ${q}`} value={score(data.quarterAverages[q])} hint={data.quarterAverages[q] === null ? 'Not yet released' : 'Average'} />
            ))}
            <StatTile tone="brand" label="General average" value={score(data.generalAverage)} hint={descriptor(data.generalAverage === null ? null : Math.round(data.generalAverage)) ?? 'After Quarter 4'} />
          </div>

          <Alert tone="info">Grades appear here once your teacher submits them for the quarter. Final grades are computed after all four quarters.</Alert>

          <Card padded={false}>
            {data.subjects.length === 0 ? (
              <EmptyState icon="book" title="No subjects yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-canvas/50">
                    <tr>
                      <th className="th">Subject</th>
                      {[1, 2, 3, 4].map((q) => <th key={q} className="th text-center w-16">Q{q}</th>)}
                      <th className="th text-center w-20">Final</th>
                      <th className="th">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.subjects.map((s) => (
                      <tr key={s.sectionSubjectId} className="hover:bg-canvas/60">
                        <td className="td">
                          <p className="font-semibold">{s.title}</p>
                          <p className="text-xs text-muted">{s.code} · {s.teacher}</p>
                        </td>
                        {[1, 2, 3, 4].map((q) => <td key={q} className="td text-center">{cell(s.quarters[q]?.score)}</td>)}
                        <td className="td text-center font-bold">{cell(s.finalGrade)}</td>
                        <td className="td">
                          {s.remarks ? (
                            <Badge tone={s.remarks === 'PASSED' ? 'success' : 'danger'}>{s.remarks === 'PASSED' ? 'Passed' : 'Failed'}</Badge>
                          ) : (
                            <span className="text-xs text-muted">In progress</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
