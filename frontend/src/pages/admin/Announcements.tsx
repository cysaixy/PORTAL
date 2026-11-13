import { DashboardLayout } from '../../components/DashboardLayout';
import { AnnouncementsManager } from '../../components/AnnouncementsManager';

export default function AdminAnnouncements() {
  return (
    <DashboardLayout title="Announcements" subtitle="School-wide notices for students and staff.">
      <AnnouncementsManager role="admin" />
    </DashboardLayout>
  );
}
