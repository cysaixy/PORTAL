import { DashboardLayout } from '../../components/DashboardLayout';
import { ADMIN_NAV } from '../../constants/navigation';

export default function GradeLocks() {
  return (
    <DashboardLayout title="Grade Locks" subtitle="Manage grade locking" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-8">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-4">Grade Locks</h2>
          <p className="text-[13px] text-[#6B6B6B] mb-4">
            Grade lock management allows you to lock/unlock grades per quarter. Locked grades cannot be edited by teachers.
          </p>
          <p className="text-[12px] text-[#6B6B6B]">
            This feature will be implemented to show locked grades by section and allow bulk unlock operations with audit logging.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
