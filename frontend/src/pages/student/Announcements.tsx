import { DashboardLayout } from '../../components/DashboardLayout';
import { STUDENT_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function StudentAnnouncements() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student', 'announcements'],
    queryFn: async () => {
      const res = await api.get<{ announcements: any[] }>('/student/announcements');
      return res.data.announcements;
    },
  });

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Important updates and notices from teachers and administration."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">Announcements</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`p-5 rounded-lg border-2 ${
                    announcement.isPinned
                      ? 'border-[#FFD21F] bg-[#FFF1C2]'
                      : 'border-[#E8E2DE] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-[#1B1F3B]">
                        {announcement.title}
                      </h3>
                      {announcement.isPinned && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[10px] font-semibold">
                          PINNED
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#6B6B6B]">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#6B6B6B] mb-2">{announcement.body}</p>
                  <div className="flex items-center gap-2 text-[11px] text-[#6B6B6B]">
                    <span>Posted by: {announcement.author?.email || 'Administration'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-[#6B6B6B] mb-2">No announcements yet.</p>
              <p className="text-[12px] text-[#6B6B6B]">Check back later for updates from your teachers.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
