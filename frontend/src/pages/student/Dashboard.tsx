import { DashboardLayout } from '../../components/DashboardLayout';
import { useStudentDashboard } from '../../hooks/useStudentDashboard';
import { useStudentGrades } from '../../hooks/useStudentGrades';
import { STUDENT_NAV } from '../../constants/navigation';

export default function StudentDashboard() {
  const { data: dashboardData, isLoading: dashboardLoading } = useStudentDashboard();
  const { data: gradesData, isLoading: gradesLoading } = useStudentGrades();

  if (dashboardLoading || gradesLoading) {
    return (
      <DashboardLayout
        title="Student dashboard"
        subtitle="Loading..."
        nav={STUDENT_NAV}
        schoolYear="SY 2024–2025"
      >
        <div className="col-span-12 flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
        </div>
      </DashboardLayout>
    );
  }

  const { statistics } = dashboardData || { statistics: { subjectCount: 0, quarterAverages: [], overallAverage: 0 } };
  const grades = gradesData || [];

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  const quarterValues = statistics.quarterAverages;
  const averageGrade = statistics.overallAverage;

  return (
    <DashboardLayout
      title="Student dashboard"
      subtitle="Your grades, subjects and announcements for School Year 2024-2025."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      {/* Average grade - maroon hero card */}
      <div className="col-span-12 lg:col-span-6 mb-6">
        <div className="bg-[#6B0A0F] text-white rounded-[16px] p-6">
          <div className="flex items-end justify-between gap-3 mb-2">
            <div>
              <p className="text-[11px] font-semibold text-[#FFD21F]/90 uppercase tracking-wider">Average grade</p>
              <p className="text-[32px] font-800 text-white">{averageGrade || '—'}</p>
              <p className="text-[12px] text-[#F0BDBD]/80">Current standing</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#FFD21F]/80">General average</p>
              <p className="text-[24px] font-800 text-white">{averageGrade || '—'}</p>
            </div>
          </div>
          <p className="text-[12px] text-[#F0BDBD]/80 mt-3 mb-3">{quarters.join('  ·  ')}</p>
          <div className="flex gap-2">
            {quarters.map((q, i) => {
              const v = quarterValues[i];
              const filled = v != null;
              return (
                <div key={q} className="flex-1 h-[10px] rounded-full relative overflow-hidden border border-white/20">
                  {filled && (
                    <div className="h-full bg-[#FFD21F]" style={{ width: `${Math.min(100, (v / 100) * 100)}%` }} />
                  )}
                  <span className={`absolute -top-[14px] left-1/2 -translate-x-1/2 text-[10px] ${filled ? 'text-white font-semibold' : 'text-white/30'}`}>
                    {q}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Subjects count + Announcements */}
      <div className="col-span-12 lg:col-span-3">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6 mb-4">
          <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">Subjects</p>
          <p className="text-[32px] font-800 text-[#1B1F3B]">{statistics.subjectCount}</p>
          <p className="text-[11px] text-[#6B6B6B]">Enrolled this year</p>
        </div>
        <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-[#8a6d00] uppercase tracking-wider">Announcements</p>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#FFF1C2] text-[#8a6d00] text-[10px] font-semibold">2 unread</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8E2DE] flex-shrink-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#6B6B6B]">!</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1B1F3B]">Quarter 2 grading starts</p>
                <p className="text-[11px] text-[#6B6B6B]">Teachers are now encoding Quarter 2 grades.</p>
                <p className="text-[10px] text-[#6B6B6B] mt-1">October 14, 2024</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E8E2DE] flex-shrink-0 flex items-center justify-center">
                <span className="text-[9px] font-bold text-[#6B6B6B]">!</span>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-[#1B1F3B]">ID photo and signature upload</p>
                <p className="text-[11px] text-[#6B6B6B]">Upload your ID photo and signature before the end of the month.</p>
                <p className="text-[10px] text-[#6B6B6B] mt-1">October 20, 2024</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* My grades table + Report card */}
      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">My grades</p>
                <p className="text-[15px] font-800 text-[#1B1F3B]">Quarterly scores by subject</p>
              </div>
            </div>
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F4F2EF]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q1</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q2</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q3</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q4</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {grades.map((grade) => {
                    const scores = [grade.quarters.q1, grade.quarters.q2, grade.quarters.q3, grade.quarters.q4];
                    const validScores = scores.filter(s => s != null).map(s => s!.score);
                    const average = validScores.length > 0
                      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
                      : '—';

                    return (
                      <tr key={grade.subject.id} className="hover:bg-[#FFF1C2]/30 transition-colors">
                        <td className="px-4 py-3 text-[#1B1F3B] font-medium">{grade.subject.title}</td>
                        <td className="px-4 py-3 text-center text-[#1B1F3B]">{grade.quarters.q1?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#1B1F3B]">{grade.quarters.q2?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#6B6B6B]">{grade.quarters.q3?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#6B6B6B]">{grade.quarters.q4?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-[#1B1F3B] font-semibold">{average}</td>
                      </tr>
                    );
                  })}
                  {grades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#6B6B6B]">
                        No grades available yet.
                      </td>
                    </tr>
                  )}
                  {grades.length > 0 && (
                    <tr className="bg-[#F4F2EF] font-semibold">
                      <td className="px-4 py-3 text-[#1B1F3B]">General average</td>
                      <td className="px-4 py-3 text-center text-[#6B6B6B]">—</td>
                      <td className="px-4 py-3 text-center text-[#6B6B6B]">—</td>
                      <td className="px-4 py-3 text-center text-[#6B6B6B]">—</td>
                      <td className="px-4 py-3 text-center text-[#6B6B6B]">—</td>
                      <td className="px-4 py-3 text-right text-[#1B1F3B]">{averageGrade || '—'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
            <p className="text-[11px] font-semibold text-[#8a6d00] uppercase tracking-wider mb-3">Form 138 / Report card</p>
            <p className="text-[12px] text-[#8a6d00] mb-4">Download your official report card for School Year 2024-2025.</p>
            <button className="w-full py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[12px] font-semibold hover:bg-[#E6C200]">
              Print report card
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
