import { DashboardLayout } from '../../components/DashboardLayout';
import { TEACHER_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AdvisoryClass() {
  const { data: advisoryData, isLoading } = useQuery({
    queryKey: ['teacher', 'advisory'],
    queryFn: async () => {
      const res = await api.get<{ section: any; students: any[] }>('/teacher/advisory');
      return res.data;
    },
  });

  return (
    <DashboardLayout
      title="Advisory class"
      subtitle="Monitor your advisory section's performance."
      nav={TEACHER_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : advisoryData?.section ? (
            <>
              <div className="mb-6">
                <h2 className="text-[18px] font-800 text-[#1B1F3B]">{advisoryData.section.name}</h2>
                <p className="text-[12px] text-[#6B6B6B]">
                  {advisoryData.section.gradeLevel.name} • {advisoryData.students?.length || 0} students
                </p>
              </div>

              {advisoryData.students && advisoryData.students.length > 0 ? (
                <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-[#F4F2EF]">
                        <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">LRN</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Name</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Sex</th>
                        <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase text-right">
                          General Average
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8E2DE]">
                      {advisoryData.students.map((student: any) => (
                        <tr key={student.id} className="hover:bg-[#FFF1C2]/30">
                          <td className="px-4 py-3 text-[#6B6B6B]">{student.lrn}</td>
                          <td className="px-4 py-3 text-[#1B1F3B] font-medium">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-3 text-[#6B6B6B]">{student.sex}</td>
                          <td className="px-4 py-3 text-right text-[#1B1F3B] font-semibold">
                            {student.generalAverage || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-[#6B6B6B] py-8">No students enrolled in this section yet.</p>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#6B6B6B] mb-2">You are not assigned as an adviser to any section.</p>
              <p className="text-[12px] text-[#6B6B6B]">
                Contact your administrator to be assigned as a section adviser.
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
