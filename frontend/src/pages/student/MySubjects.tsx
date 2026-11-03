import { DashboardLayout } from '../../components/DashboardLayout';
import { useStudentSubjects } from '../../hooks/useStudentSubjects';
import { STUDENT_NAV } from '../../constants/navigation';

export default function MySubjects() {
  const { data: subjects, isLoading } = useStudentSubjects();

  if (isLoading) {
    return (
      <DashboardLayout
        title="My subjects"
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
      title="My subjects"
      subtitle="Your enrolled subjects for this school year."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects && subjects.length > 0 ? (
          subjects.map((subject) => (
            <div key={subject.id} className="bg-white border border-[#E8E2DE] rounded-[16px] p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-[15px] font-800 text-[#1B1F3B] mb-1">{subject.title}</h3>
                  <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider">{subject.code}</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#6B6B6B]">Teacher:</span>
                  <span className="text-[12px] text-[#1B1F3B] font-medium">
                    {subject.teacher.firstName} {subject.teacher.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#6B6B6B]">Section:</span>
                  <span className="text-[12px] text-[#1B1F3B]">{subject.section}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-[#E8E2DE]">
                <p className="text-[11px] text-[#6B6B6B]">Subject code</p>
                <p className="text-[14px] font-semibold text-[#1B1F3B]">{subject.code}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-white border border-[#E8E2DE] rounded-[16px] p-8 text-center">
            <p className="text-[13px] text-[#6B6B6B]">No subjects enrolled yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
