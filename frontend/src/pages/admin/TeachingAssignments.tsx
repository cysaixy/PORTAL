import { DashboardLayout } from '../../components/DashboardLayout';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function TeachingAssignments() {
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['admin', 'teaching-assignments'],
    queryFn: async () => {
      const res = await api.get<{ teachingAssignments: any[] }>('/admin/teaching-assignments?limit=1000');
      return res.data.teachingAssignments;
    },
  });

  return (
    <DashboardLayout title="Teaching Assignments" subtitle="Teacher-Subject-Section mappings" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">Teaching Assignments</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F4F2EF]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Teacher</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Section</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {assignments?.map(a => (
                    <tr key={a.id} className="hover:bg-[#FFF1C2]/30">
                      <td className="px-4 py-3 text-[#1B1F3B]">{a.teacher?.firstName} {a.teacher?.lastName}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{a.section?.name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{a.subject?.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
