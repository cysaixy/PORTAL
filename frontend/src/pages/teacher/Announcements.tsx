import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Modal } from '../../components/Modal';
import { TEACHER_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function TeacherAnnouncements() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['teacher', 'announcements'],
    queryFn: async () => {
      const res = await api.get<{ announcements: any[] }>('/teacher/announcements');
      return res.data.announcements;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post('/teacher/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher', 'announcements'] });
      setIsAddModalOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({
      title: fd.get('title'),
      body: fd.get('body'),
      audience: fd.get('audience'),
    });
  };

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Post announcements to your students."
      nav={TEACHER_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[18px] font-800 text-[#1B1F3B]">Announcements</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#E6C200]"
            >
              Post Announcement
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="p-4 border border-[#E8E2DE] rounded-lg hover:bg-[#FFF1C2]/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-[15px] font-semibold text-[#1B1F3B]">{announcement.title}</h3>
                    <span className="text-[11px] text-[#6B6B6B]">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#6B6B6B] mb-2">{announcement.body}</p>
                  <span className="inline-block px-2 py-1 rounded-full bg-[#F4F2EF] text-[10px] font-semibold text-[#6B6B6B]">
                    {announcement.audience}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#6B6B6B] py-8">
              No announcements yet. Click "Post Announcement" to create one.
            </p>
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Post Announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Title *</label>
            <input
              type="text"
              name="title"
              required
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Message *</label>
            <textarea
              name="body"
              required
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-1">Audience *</label>
            <select
              name="audience"
              required
              className="w-full px-4 py-2 rounded-lg border border-[#E8E2DE] text-[13px] focus:outline-none focus:border-[#6B0A0F]"
            >
              <option value="TEACHERS">Teachers Only</option>
              <option value="STUDENTS">Students Only</option>
              <option value="ALL">Everyone</option>
            </select>
          </div>
          {createMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800">
              Error: {(createMutation.error as any)?.response?.data?.error || 'Failed to post'}
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
              {createMutation.isPending ? 'Posting...' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
