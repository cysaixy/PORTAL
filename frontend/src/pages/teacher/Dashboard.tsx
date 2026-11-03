import { DashboardLayout } from '../../components/DashboardLayout';
import { StatusPill } from '../../components';
import { TEACHER_NAV } from '../../constants/navigation';

const TEACHER_CLASSES = [
  { section: '7-Einstein', subject: 'Mathematics 7', encoded: 8, total: 8, locked: true },
  { section: '8-Newton', subject: 'English 8', encoded: 6, total: 10, locked: false },
  { section: '11-STEM-A', subject: 'General Mathematics', encoded: 0, total: 5, locked: false },
  { section: '11-STEM-A', subject: 'Basic Calculus', encoded: 0, total: 5, locked: false },
  { section: '12-ABM-A', subject: 'Business Mathematics', encoded: 5, total: 5, locked: true },
];

export default function TeacherDashboard() {
  const pendingGrades = TEACHER_CLASSES.filter((c) => !c.locked).reduce((a, b) => a + (b.total - b.encoded), 0);
  const totalSections = TEACHER_CLASSES.length;
  const totalStudents = TEACHER_CLASSES.reduce((a, b) => a + b.total, 0);

  return (
    <DashboardLayout
      title="Teacher dashboard"
      subtitle="Your classes, grade encoding and announcements."
      nav={TEACHER_NAV}
      schoolYear="SY 2024–2025 · Quarter 2"
    >
      {/* Pending grades - maroon hero card */}
      <div className="col-span-12 lg:col-span-6 mb-6">
        <div className="bg-[#6B0A0F] text-white rounded-[16px] p-6">
          <div className="flex items-end justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold text-[#FFD21F]/90 uppercase tracking-wider">Pending grades · Quarter 2</p>
              <p className="text-[32px] font-800 text-white">{pendingGrades}</p>
              <p className="text-[12px] text-[#F0BDBD]/80">To be encoded this quarter</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[#FFD21F]/80">Quarter 2</p>
              <p className="text-[24px] font-800 text-white">{pendingGrades}</p>
            </div>
          </div>
          <p className="text-[12px] text-[#F0BDBD]/80 mb-3">Per class — grades left to encode</p>
          <div className="space-y-2">
            {TEACHER_CLASSES.filter((c) => !c.locked).map((c) => {
              const left = c.total - c.encoded;
              return (
                <div key={c.subject} className="flex items-center justify-between bg-white/10 p-3 rounded-[8px]">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-medium text-white">{c.section}</span>
                    <span className="text-[11px] text-[#FFD21F]/80">{c.subject}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-white">{left} left</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* My sections + Total students */}
      <div className="col-span-12 lg:col-span-3">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6 mb-4">
          <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">My sections</p>
          <p className="text-[32px] font-800 text-[#1B1F3B]">{totalSections}</p>
          <p className="text-[11px] text-[#6B6B6B]">Assigned classes</p>
        </div>
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-1">Total students</p>
          <p className="text-[32px] font-800 text-[#1B1F3B]">{totalStudents}</p>
          <p className="text-[11px] text-[#6B6B6B]">Across your sections</p>
        </div>
      </div>

      {/* My classes table - 8 cols + side stack */}
      <div className="col-span-12 grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">My classes</p>
                <p className="text-[15px] font-800 text-[#1B1F3B]">Grade encoding status</p>
              </div>
            </div>
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F4F2EF]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Section</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Subject</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Encoded</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {TEACHER_CLASSES.map((c) => {
                    const pct = Math.round((c.encoded / c.total) * 100);
                    return (
                      <tr key={c.subject} className="hover:bg-[#FFF1C2]/30 transition-colors">
                        <td className="px-4 py-3 text-[#1B1F3B] font-medium">{c.section}</td>
                        <td className="px-4 py-3 text-[#6B6B6B]">{c.subject}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[#1B1F3B]">{c.encoded}</span>
                            <span className="text-[#6B6B6B] text-[11px]">/{c.total}</span>
                          </div>
                          <div className="w-full h-[6px] rounded-full bg-[#E8E2DE] mt-1 overflow-hidden">
                            <div className="h-full bg-[#6B0A0F]" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={c.locked ? 'Locked' : 'In progress'} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className={`px-3 py-1.5 rounded-[8px] text-[11px] font-semibold ${c.locked ? 'text-[#6B6B6B] hover:bg-[#FFF1C2] border border-[#E8E2DE]' : 'bg-[#FFD21F] text-[#1B1F3B]'}`}>
                            {c.locked ? 'View' : 'Encode'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Advisory class card */}
          <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
            <p className="text-[11px] font-semibold text-[#8a6d00] uppercase tracking-wider mb-2">Advisory class</p>
            <p className="text-[15px] font-800 text-[#8a6d00] mb-1">7-Einstein</p>
            <p className="text-[11px] text-[#8a6d00] mb-3">Mathematics 7 · 8 students</p>
            <button className="w-full py-2.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[12px] font-semibold hover:bg-[#E6C200]">
              Open advisory class
            </button>
          </div>

          {/* Announcements card */}
          <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
            <p className="text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider mb-2">Post announcement</p>
            <p className="text-[13px] text-[#6B6B6B] mb-4">Share a message with your classes.</p>
            <button className="w-full py-2.5 rounded-full border-2 border-[#E8E2DE] text-[#1B1F3B] text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled>
              Compose announcement
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
