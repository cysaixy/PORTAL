import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function Subjects() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['admin', 'subjects'],
    queryFn: async () => {
      const res = await api.get<{ subjects: any[] }>('/admin/subjects?limit=1000');
      return res.data.subjects;
    },
  });

  const { data: gradeLevels } = useQuery({
    queryKey: ['admin', 'grade-levels'],
    queryFn: async () => {
      const res = await api.get<{ gradeLevels: any[] }>('/admin/grade-levels');
      return res.data.gradeLevels;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/admin/subjects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] });
      setIsAddModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/subjects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'subjects'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      code: fd.get('code'),
      title: fd.get('title'),
      gradeLevelId: fd.get('gradeLevelId'),
      category: fd.get('category'),
    });
  };

  return (
    <DashboardLayout title="Subjects" subtitle="Manage subjects and courses" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[18px] font-800 text-[#1B1F3B]">Subjects</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-1">{subjects?.length || 0} total subjects</p>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200]">Add Subject</button>
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
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Code</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Title</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Grade Level</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Category</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {subjects?.map(subj => (
                    <tr key={subj.id} className="hover:bg-[#FFF1C2]/30">
                      <td className="px-4 py-3 font-medium text-[#1B1F3B]">{subj.code}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{subj.title}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{subj.gradeLevel?.name || '—'}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{subj.category}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => confirm('Delete?') && deleteMutation.mutate(subj.id)} className="text-[12px] text-red-600 hover:text-red-800 font-medium">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Subject">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Subject Code *</label>
            <input type="text" name="code" required placeholder="e.g., MATH7" className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Subject Title *</label>
            <input type="text" name="title" required placeholder="e.g., Mathematics 7" className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Grade Level *</label>
            <select name="gradeLevelId" required className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              <option value="">Select Grade Level</option>
              {gradeLevels?.map(gl => <option key={gl.id} value={gl.id}>{gl.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Category *</label>
            <select name="category" required className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              <option value="CORE">Core</option>
              <option value="SPECIALIZED">Specialized</option>
              <option value="APPLIED">Applied</option>
            </select>
          </div>
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">Error: {(createMutation.error as any)?.response?.data?.error || 'Failed'}</div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[13px] font-semibold">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold">{createMutation.isPending ? 'Adding...' : 'Add Subject'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
