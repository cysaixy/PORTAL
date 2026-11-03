import { DashboardLayout } from '../../components/DashboardLayout';
import { TEACHER_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

interface Section {
  id: string;
  name: string;
  subject: { title: string; code: string };
  studentCount: number;
  gradeLevel: { name: string };
}

export default function MySections() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ['teacher', 'sections'],
    queryFn: async () => {
      const res = await api.get<{ sections: Section[] }>('/teacher/sections');
      return res.data.sections;
    },
  });

  return (
    <DashboardLayout
      title="My sections"
      subtitle="View all your assigned sections and subjects."
      nav={TEACHER_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">My Sections</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : sections && sections.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-[#E8E2DE] rounded-[16px] p-6 hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-[15px] font-800 text-[#1B1F3B] mb-1">{section.name}</h3>
                  <p className="text-[11px] text-[#6B6B6B] uppercase tracking-wider mb-3">
                    {section.gradeLevel.name}
                  </p>
                  <div className="space-y-2 mb-4">
                    <div>
                      <p className="text-[11px] text-[#6B6B6B]">Subject</p>
                      <p className="text-[13px] text-[#1B1F3B] font-medium">{section.subject.title}</p>
                      <p className="text-[11px] text-[#6B6B6B]">{section.subject.code}</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#E8E2DE]">
                    <p className="text-[11px] text-[#6B6B6B]">Students</p>
                    <p className="text-[24px] font-800 text-[#6B0A0F]">{section.studentCount}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#6B6B6B] py-8">
              No sections assigned yet. Contact your administrator to get teaching assignments.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
