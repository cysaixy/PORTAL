import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Alert, Button, Card, ErrorState, PageLoader } from '../../components/ui';
import api from '../../lib/api';
import { formatDate } from '../../lib/format';
import { descriptor, GradeReport, SectionSummary } from '../../hooks/useStudent';

interface ReportCardData extends GradeReport {
  school: { name: string; address: string };
  student: { name: string; lrn: string; sex: 'M' | 'F'; birthdate: string };
  section: SectionSummary;
  complete: boolean;
  generatedAt: string;
}

const SCALE: [string, string, string][] = [
  ['Outstanding', '90–100', 'Passed'],
  ['Very satisfactory', '85–89', 'Passed'],
  ['Satisfactory', '80–84', 'Passed'],
  ['Fairly satisfactory', '75–79', 'Passed'],
  ['Did not meet expectations', 'Below 75', 'Failed'],
];

export default function ReportCard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['student', 'report-card'],
    queryFn: () => api.get<ReportCardData>('/student/report-card').then((r) => r.data),
  });

  return (
    <DashboardLayout
      title="Report card"
      subtitle="Learner's progress report (Form 138 style). Use Print to save as PDF."
      actions={data && <Button variant="primary" icon="printer" onClick={() => window.print()}>Print / Save PDF</Button>}
    >
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : data ? (
        <>
          {!data.complete && (
            <div className="mb-4 no-print">
              <Alert tone="info">This is a progress copy — final grades and the general average appear once all four quarters are submitted.</Alert>
            </div>
          )}
          <div className="print-sheet mx-auto max-w-[820px] bg-white border border-line rounded-2xl shadow-card p-6 sm:p-10 text-[13px]">
            <header className="text-center border-b-2 border-brand-800 pb-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Republic of the Philippines</p>
              <h2 className="mt-1 text-xl font-extrabold text-brand-800">{data.school.name}</h2>
              <p className="text-xs text-muted">{data.school.address}</p>
              <p className="mt-3 text-sm font-bold uppercase tracking-wider">Learner's Progress Report Card</p>
              <p className="text-xs text-muted">School Year {data.section.schoolYear}</p>
            </header>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 py-4 border-b border-line">
              <div className="col-span-2"><dt className="text-[10px] uppercase text-muted">Name</dt><dd className="font-semibold">{data.student.name}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">LRN</dt><dd className="font-semibold tabular-nums">{data.student.lrn}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">Sex</dt><dd className="font-semibold">{data.student.sex === 'M' ? 'Male' : 'Female'}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">Grade & section</dt><dd className="font-semibold">{data.section.gradeLevel} · {data.section.name}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">Strand</dt><dd className="font-semibold">{data.section.strand ?? '—'}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">Birthdate</dt><dd className="font-semibold">{formatDate(data.student.birthdate)}</dd></div>
              <div><dt className="text-[10px] uppercase text-muted">Adviser</dt><dd className="font-semibold">{data.section.adviser ?? '—'}</dd></div>
            </dl>

            <table className="w-full mt-5 border border-ink/30 text-[12px]">
              <thead>
                <tr className="bg-brand-50">
                  <th rowSpan={2} className="border border-ink/30 px-2 py-1.5 text-left">Learning areas</th>
                  <th colSpan={4} className="border border-ink/30 px-2 py-1">Quarter</th>
                  <th rowSpan={2} className="border border-ink/30 px-2 py-1 w-16">Final grade</th>
                  <th rowSpan={2} className="border border-ink/30 px-2 py-1 w-20">Remarks</th>
                </tr>
                <tr className="bg-brand-50">
                  {[1, 2, 3, 4].map((q) => <th key={q} className="border border-ink/30 px-2 py-1 w-12">{q}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((s) => (
                  <tr key={s.sectionSubjectId}>
                    <td className="border border-ink/30 px-2 py-1.5">{s.title}</td>
                    {[1, 2, 3, 4].map((q) => (
                      <td key={q} className="border border-ink/30 px-2 py-1.5 text-center tabular-nums">{s.quarters[q] ? Math.round(s.quarters[q]!.score) : ''}</td>
                    ))}
                    <td className="border border-ink/30 px-2 py-1.5 text-center font-bold tabular-nums">{s.finalGrade ?? ''}</td>
                    <td className="border border-ink/30 px-2 py-1.5 text-center">{s.remarks === 'PASSED' ? 'Passed' : s.remarks === 'FAILED' ? 'Failed' : ''}</td>
                  </tr>
                ))}
                <tr className="bg-canvas font-bold">
                  <td colSpan={5} className="border border-ink/30 px-2 py-1.5 text-right">General average</td>
                  <td className="border border-ink/30 px-2 py-1.5 text-center tabular-nums">{data.generalAverage !== null ? Math.round(data.generalAverage) : ''}</td>
                  <td className="border border-ink/30 px-2 py-1.5 text-center">{data.generalAverage !== null ? (data.generalAverage >= data.passingScore ? 'Promoted' : 'Retained') : ''}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid sm:grid-cols-2 gap-6 mt-6">
              <table className="text-[11px] w-full">
                <thead>
                  <tr className="text-left text-muted">
                    <th className="font-semibold pb-1">Descriptor</th>
                    <th className="font-semibold pb-1">Grading scale</th>
                    <th className="font-semibold pb-1">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {SCALE.map(([d, s, r]) => (
                    <tr key={d} className={descriptor(data.generalAverage === null ? null : Math.round(data.generalAverage)) === d ? 'font-bold' : ''}>
                      <td className="py-0.5">{d}</td>
                      <td className="py-0.5">{s}</td>
                      <td className="py-0.5">{r}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="grid grid-cols-2 gap-6 items-end text-center text-[11px]">
                <div>
                  <div className="border-b border-ink/60 h-10 flex items-end justify-center font-semibold">{data.section.adviser ?? ''}</div>
                  <p className="mt-1 text-muted">Class adviser</p>
                </div>
                <div>
                  <div className="border-b border-ink/60 h-10" />
                  <p className="mt-1 text-muted">Parent / guardian</p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-center text-[10px] text-muted">
              Generated {formatDate(data.generatedAt)} · Unofficial copy from the LOA Portal (sample data) · Quarter grades shown are those submitted by teachers{data.complete ? '' : ' so far'}
            </p>
          </div>
        </>
      ) : null}
    </DashboardLayout>
  );
}
