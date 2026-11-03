import { DashboardLayout } from '../../components/DashboardLayout';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function GradeLevels() {
  const { data: gradeLevels, isLoading } = useQuery({
    queryKey: ['admin', 'grade-levels'],
    queryFn: async () => {
      const res = await api.get<{ gradeLevels: any[] }>('/admin/grade-levels');
      return res.data.gradeLevels;
    },
  });

  return (
    <DashboardLayout title="Grade Levels & Strands" subtitle="View grade levels (Grades 7-12)" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">Grade Levels</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {gradeLevels?.map(gl => (
                <div key={gl.id} className="p-4 border border-[#E8E2DE] rounded-lg hover:bg-[#FFF1C2]/30">
                  <h3 className="text-[15px] font-semibold text-[#1B1F3B]">{gl.name}</h3>
                  <p className="text-[12px] text-[#6B6B6B]">{gl.isSeniorHigh ? 'Senior High School' : 'Junior High School'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
