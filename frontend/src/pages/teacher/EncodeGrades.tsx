import { DashboardLayout } from '../../components/DashboardLayout';
import { TEACHER_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function EncodeGrades() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ['teacher', 'sections'],
    queryFn: async () => {
      const res = await api.get<{ sections: any[] }>('/teacher/sections');
      return res.data.sections;
    },
  });

  return (
    <DashboardLayout
      title="Encode grades"
      subtitle="Enter student grades for your sections."
      nav={TEACHER_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-4">Encode Grades</h2>
          <p className="text-[13px] text-[#6B6B6B] mb-6">
            Select a section to encode grades for your students.
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : sections && sections.length > 0 ? (
            <div className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-4 border border-[#E8E2DE] rounded-lg hover:bg-[#FFF1C2]/30 transition-colors"
                >
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1B1F3B]">{section.name}</h3>
                    <p className="text-[12px] text-[#6B6B6B]">
                      {section.subject.title} • {section.studentCount} students
                    </p>
                  </div>
                  <button className="px-4 py-2 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[12px] font-semibold hover:bg-[#E6C200]">
                    Encode Grades
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#6B6B6B] py-8">
              No sections assigned. You need sections to encode grades.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
