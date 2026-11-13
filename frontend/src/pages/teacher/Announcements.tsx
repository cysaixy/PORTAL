import { DashboardLayout } from '../../components/DashboardLayout';
import { AnnouncementsManager } from '../../components/AnnouncementsManager';

export default function TeacherAnnouncements() {
  return (
    <DashboardLayout title="Announcements" subtitle="Post to your sections or grade levels, and read notices from the registrar.">
      <AnnouncementsManager role="teacher" />
    </DashboardLayout>
  );
}
