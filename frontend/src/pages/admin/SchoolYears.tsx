import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface SchoolYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export default function SchoolYears() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: schoolYears, isLoading } = useQuery({
    queryKey: ['admin', 'school-years'],
    queryFn: async () => {
      const response = await api.get<{ schoolYears: SchoolYear[] }>('/admin/school-years');
      return response.data.schoolYears;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return api.post('/admin/school-years', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'school-years'] });
      setIsAddModalOpen(false);
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.patch(`/admin/school-years/${id}/set-current`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'school-years'] });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      label: formData.get('label'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate'),
    });
  };

  return (
    <DashboardLayout title="School Years" subtitle="Manage academic years" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-800 text-[#1B1F3B]">School Years</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200]"
            >
              Add School Year
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {schoolYears?.map((sy) => (
                <div
                  key={sy.id}
                  className="flex items-center justify-between p-4 border border-[#E8E2DE] rounded-lg hover:bg-[#FFF1C2]/30"
                >
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1B1F3B]">{sy.label}</h3>
                    <p className="text-[12px] text-[#6B6B6B]">
                      {new Date(sy.startDate).toLocaleDateString()} - {new Date(sy.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {sy.isCurrent ? (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold">
                        Current
                      </span>
                    ) : (
                      <button
                        onClick={() => setCurrentMutation.mutate(sy.id)}
                        className="px-3 py-1 rounded-full border border-[#E8E2DE] text-[11px] font-semibold hover:bg-[#F4F2EF]"
                      >
                        Set as Current
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add School Year">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Label *</label>
            <input
              type="text"
              name="label"
              required
              placeholder="2024-2025"
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Start Date *</label>
            <input
              type="date"
              name="startDate"
              required
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">End Date *</label>
            <input
              type="date"
              name="endDate"
              required
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            />
          </div>
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">
              Error: {(createMutation.error as any)?.response?.data?.error || 'Failed to create'}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[13px] font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold"
            >
              {createMutation.isPending ? 'Adding...' : 'Add School Year'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
