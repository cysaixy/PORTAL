import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AllowedEmails() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: emails, isLoading } = useQuery({
    queryKey: ['admin', 'allowed-emails'],
    queryFn: async () => {
      const res = await api.get<{ allowedEmails: any[] }>('/admin/allowed-emails?limit=1000');
      return res.data.allowedEmails;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/admin/allowed-emails', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] });
      setIsAddModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/admin/allowed-emails/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'allowed-emails'] }),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({ email: fd.get('email'), role: fd.get('role') });
  };

  return (
    <DashboardLayout title="Allowed Emails" subtitle="Manage email access list" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[18px] font-800 text-[#1B1F3B]">Allowed Emails</h2>
              <p className="text-[12px] text-[#6B6B6B] mt-1">Only emails on this list can log in</p>
            </div>
            <button onClick={() => setIsAddModalOpen(true)} className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200]">Add Email</button>
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
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Email</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Role</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {emails?.map(e => (
                    <tr key={e.id} className="hover:bg-[#FFF1C2]/30">
                      <td className="px-4 py-3 font-medium text-[#1B1F3B]">{e.email}</td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{e.role}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => confirm('Remove?') && deleteMutation.mutate(e.id)} className="text-[12px] text-red-600 hover:text-red-800 font-medium">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Allowed Email">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Email *</label>
            <input type="email" name="email" required className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]" />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Role *</label>
            <select name="role" required className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]">
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          {createMutation.isError && (<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">Error: {(createMutation.error as any)?.response?.data?.error || 'Failed'}</div>)}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[13px] font-semibold">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold">{createMutation.isPending ? 'Adding...' : 'Add Email'}</button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
