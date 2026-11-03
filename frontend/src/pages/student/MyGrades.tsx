import { DashboardLayout } from '../../components/DashboardLayout';
import { useStudentGrades } from '../../hooks/useStudentGrades';
import { STUDENT_NAV } from '../../constants/navigation';

export default function MyGrades() {
  const { data: grades, isLoading } = useStudentGrades();

  if (isLoading) {
    return (
      <DashboardLayout
        title="My grades"
        subtitle="Loading..."
        nav={STUDENT_NAV}
        schoolYear="SY 2024–2025 · Quarter 2"
      >
        <div className="col-span-12 flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My grades"
      subtitle="View your quarterly grades and performance across all subjects."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#F4F2EF]">
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Teacher</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q1</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q2</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q3</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-center">Q4</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2DE]">
                {grades && grades.length > 0 ? (
                  grades.map((grade) => {
                    const scores = [grade.quarters.q1, grade.quarters.q2, grade.quarters.q3, grade.quarters.q4];
                    const validScores = scores.filter(s => s != null).map(s => s!.score);
                    const average = validScores.length > 0
                      ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
                      : '—';

                    return (
                      <tr key={grade.subject.id} className="hover:bg-[#FFF1C2]/30 transition-colors">
                        <td className="px-4 py-3 text-[#1B1F3B] font-medium">{grade.subject.title}</td>
                        <td className="px-4 py-3 text-center text-[#6B6B6B]">
                          {grade.teacher.firstName} {grade.teacher.lastName}
                        </td>
                        <td className="px-4 py-3 text-center text-[#1B1F3B]">{grade.quarters.q1?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#1B1F3B]">{grade.quarters.q2?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#6B6B6B]">{grade.quarters.q3?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-center text-[#6B6B6B]">{grade.quarters.q4?.score ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-[#1B1F3B] font-semibold">{average}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#6B6B6B]">
                      No grades available yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
