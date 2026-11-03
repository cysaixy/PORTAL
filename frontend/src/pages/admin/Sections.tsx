import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface Section {
  id: string;
  name: string;
  capacity: number;
  gradeLevel: { name: string };
  adviser?: { firstName: string; lastName: string };
  schoolYear: { label: string };
  _count?: { students: number };
}

export default function Sections() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: sections, isLoading } = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: async () => {
      const res = await api.get<{ sections: Section[] }>('/admin/sections?limit=1000');
      return res.data.sections;
    },
  });

  const { data: gradeLevels } = useQuery({
    queryKey: ['admin', 'grade-levels'],
    queryFn: async () => {
      const res = await api.get<{ gradeLevels: any[] }>('/admin/grade-levels');
      return res.data.gradeLevels;
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ['admin', 'teachers'],
    queryFn: async () => {
      const res = await api.get<{ teachers: any[] }>('/admin/teachers?limit=1000');
      return res.data.teachers;
    },
  });

  const { data: schoolYears } = useQuery({
    queryKey: ['admin', 'school-years'],
    queryFn: async () => {
      const res = await api.get<{ schoolYears: any[] }>('/admin/school-years');
      return res.data.schoolYears;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/admin/sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] });
      setIsAddModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/sections/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'sections'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      name: fd.get('name'),
      gradeLevelId: fd.get('gradeLevelId'),
      adviserId: fd.get('adviserId') || undefined,
      schoolYearId: fd.get('schoolYearId'),
      capacity: Number(fd.get('capacity')),
    });
  };

  const currentYear = schoolYears?.find(sy => sy.isCurrent);

  return (
    <DashboardLayout title="Sections" subtitle="Manage class sections" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[18px] font-800 text-[#1B1F3B]">Sections</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-1">{sections?.length || 0} total sections</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200]"
            >
              Add Section
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F4F2EF]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Section</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Grade Level</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Adviser</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Capacity</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">School Year</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {sections?.map(section => (
                    <tr key={section.id} className="hover:bg-[#FFF1C2]/30">
                      <td className="px-4 py-3 font-medium text-[#1B1F3B]">{section.name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{section.gradeLevel.name}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">
                        {section.adviser ? `${section.adviser.firstName} ${section.adviser.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{section.capacity}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{section.schoolYear.label}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => confirm('Delete?') && deleteMutation.mutate(section.id)}
                          className="text-[12px] text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Section">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Section Name *</label>
            <input type="text" name="name" required placeholder="e.g., 7-Einstein" className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Grade Level *</label>
            <select name="gradeLevelId" required className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              <option value="">Select Grade Level</option>
              {gradeLevels?.map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Adviser (optional)</label>
            <select name="adviserId" className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              <option value="">No Adviser</option>
              {teachers?.map(t => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">School Year *</label>
            <select name="schoolYearId" required defaultValue={currentYear?.id} className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              {schoolYears?.map(sy => <option key={sy.id} value={sy.id}>{sy.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Capacity *</label>
            <input type="number" name="capacity" required defaultValue={40} min={1} className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]" />
          </div>
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">
              Error: {(createMutation.error as any)?.response?.data?.error || 'Failed'}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[13px] font-semibold">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold">{createMutation.isPending ? 'Adding...' : 'Add Section'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
