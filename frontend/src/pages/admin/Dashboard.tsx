import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { StatCard, StatusPill, ProgressBar } from '../../components';
import LoadingSpinner from '../../components/LoadingSpinner';
import { pillClasses } from '../../lib/design';
import { ADMIN_NAV } from '../../constants/navigation';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <DashboardLayout
        title="Admin dashboard"
        subtitle="School overview, grade submissions and items that need attention."
        nav={ADMIN_NAV}
        schoolYear="Loading..."
      >
        <div className="col-span-12 flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !stats) {
    return (
      <DashboardLayout
        title="Admin dashboard"
        subtitle="School overview, grade submissions and items that need attention."
        nav={ADMIN_NAV}
        schoolYear=""
      >
        <div className="col-span-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            Failed to load dashboard data. Please try again.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { students, teachers, sections, subjects, gradeSubmission, recentActivity, schoolYear } = stats;
  const totalStudents = students.total;
  const juniorHigh = students.juniorHigh;
  const seniorHigh = students.seniorHigh;

  return (
    <DashboardLayout
      title="Admin dashboard"
      subtitle="School overview, grade submissions and items that need attention."
      nav={ADMIN_NAV}
      schoolYear={`SY ${schoolYear.label} · Current`}
    >
      {/* Quick-action buttons */}
      <div className="col-span-12 flex gap-2 flex-wrap mb-6">
        <button className={pillClasses.primary} onClick={() => navigate('/admin/students')}>
          + Add student
        </button>
        <button className={pillClasses.primary} onClick={() => navigate('/admin/teachers')}>
          + Add teacher
        </button>
        <button className={pillClasses.primary} disabled>
          + Create section
        </button>
        <button className={pillClasses.primary} disabled>
          + Add subject
        </button>
        <button className={pillClasses.secondary} disabled>
          Start new school year
        </button>
      </div>

      {/* Stat cards row */}
      <div className="col-span-12 grid grid-cols-12 gap-4 mb-6">
        {/* Students - hero maroon card */}
        <div className="col-span-6 lg:col-span-6">
          <StatCard
            label="Students enrolled"
            value={totalStudents}
            sublabel={`Junior high: ${juniorHigh} · Senior high: ${seniorHigh}`}
            variant="maroon"
          >
            <div className="space-y-2">
              {students.byGrade.map((g) => {
                const pct = totalStudents > 0 ? Math.round((g.count / totalStudents) * 100) : 0;
                return (
                  <div key={g.grade} className="flex items-center gap-3">
                    <span className="w-[24px] text-[11px] font-semibold text-white">{g.grade}</span>
                    <div className="flex-1 h-[8px] rounded-full bg-white/20 overflow-hidden">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: g.isSeniorHigh ? '#FFD21F' : '#C8161D' }} />
                    </div>
                    <span className="w-[28px] text-[11px] text-[#F0BDBD] text-right">{g.count}</span>
                  </div>
                );
              })}
              <div className="mt-3 h-[8px] rounded-full bg-white/20 overflow-hidden flex">
                <div className="h-full" style={{ width: totalStudents > 0 ? `${Math.round((juniorHigh / totalStudents) * 100)}%` : '50%', backgroundColor: '#C8161D' }} />
                <div className="h-full" style={{ width: totalStudents > 0 ? `${Math.round((seniorHigh / totalStudents) * 100)}%` : '50%', backgroundColor: '#FFD21F' }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[#F0BDBD]/80">
                <span>Junior high</span>
                <span>Senior high</span>
              </div>
            </div>
          </StatCard>
        </div>

        {/* Teachers - hero maroon card */}
        <div className="col-span-6 lg:col-span-3">
          <StatCard
            label="Teachers"
            value={teachers.total}
            sublabel="Faculty"
            variant="maroon"
          >
            <div className="h-[8px] rounded-full bg-white/20 overflow-hidden mb-2 flex">
              <div className="h-full" style={{ width: teachers.total > 0 ? `${Math.round((teachers.teaching / teachers.total) * 100)}%` : '50%', backgroundColor: '#15803d' }} />
              <div className="h-full" style={{ width: teachers.total > 0 ? `${Math.round((teachers.withoutLoad / teachers.total) * 100)}%` : '50%', backgroundColor: '#FFD21F' }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-[#F0BDBD]/80">
              <span>{teachers.teaching} teaching</span>
              <span>{teachers.withoutLoad} without a load</span>
            </div>
          </StatCard>
        </div>

        {/* Sections - white card */}
        <div className="col-span-6 lg:col-span-2">
          <StatCard label="Sections" value={sections.total} sublabel="Grades 7–12" variant="white" />
        </div>

        {/* Subjects - pale yellow card */}
        <div className="col-span-6 lg:col-span-2">
          <StatCard 
            label="Subjects" 
            value={subjects.total} 
            sublabel={subjects.withoutTeacher > 0 ? `${subjects.withoutTeacher} have no teacher` : 'All assigned'} 
            variant="yellow" 
          />
        </div>
      </div>

      {/* Row: progress bars wide + needs attention narrow */}
      <div className="col-span-12 grid grid-cols-12 gap-4">
        {/* Quarter grade submission - 7 cols */}
        <div className="col-span-7 lg:col-span-8">
          <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#6B6B6B]">Quarter grade submission</p>
                <p className="text-[15px] font-800 text-[#1B1F3B]">By grade level</p>
              </div>
              <span className="text-[11px] text-[#6B6B6B]">SY {schoolYear.label}</span>
            </div>
            <div className="space-y-3">
              {gradeSubmission.map((g) => {
                const pct = g.total > 0 ? Math.round((g.submitted / g.total) * 100) : 0;
                return (
                  <div key={g.grade} className="flex items-center gap-3">
                    <span className="w-[24px] text-[12px] font-semibold text-[#1B1F3B]">{g.grade}</span>
                    <div className="flex-1 h-[10px] rounded-full bg-[#E8E2DE] overflow-hidden">
                      <ProgressBar value={g.submitted} max={g.total} status={pct < 60 ? 'warning' : 'brand'} />
                    </div>
                    <span className="w-[32px] text-[12px] text-[#6B6B6B] text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Needs attention - 5 cols pale yellow */}
        <div className="col-span-5 lg:col-span-4">
          <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] font-semibold text-[#8a6d00]">Needs attention</p>
                <p className="text-[15px] font-800 text-[#8a6d00]">11 items</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-white/40 p-3 rounded-[8px] border border-[#E6C200]">
                <div>
                  <p className="text-[12px] font-semibold text-[#1B1F3B]">Unlock requests</p>
                  <p className="text-[11px] text-[#8a6d00]/80">Grade sheets awaiting registrar approval</p>
                </div>
                <button className="px-3 py-1.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[11px] font-semibold">Review 3</button>
              </div>
              <div className="flex items-center justify-between bg-white/40 p-3 rounded-[8px] border border-[#E6C200]">
                <div>
                  <p className="text-[12px] font-semibold text-[#1B1F3B]">Subjects with no teacher</p>
                  <p className="text-[11px] text-[#8a6d00]/80">Cannot encode grades until assigned</p>
                </div>
                {subjects.withoutTeacher > 0 && (
                  <button className="px-3 py-1.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[11px] font-semibold">
                    Assign {subjects.withoutTeacher}
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between bg-white/40 p-3 rounded-[8px] border border-[#E6C200]">
                <div>
                  <p className="text-[12px] font-semibold text-[#1B1F3B]">Students with no section</p>
                  <p className="text-[11px] text-[#8a6d00]/80">Not enrolled this school year</p>
                </div>
                <button className="px-3 py-1.5 rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[11px] font-semibold">Place 2</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent grade activity - full width */}
      <div className="col-span-12 mt-6">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-[#6B6B6B]">Recent grade activity</p>
              <p className="text-[15px] font-800 text-[#1B1F3B]">This week</p>
            </div>
            <button className="text-[12px] font-semibold text-[#6B0A0F] hover:text-[#C8161D]">
              View audit log
            </button>
          </div>
          <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="bg-[#F4F2EF] border-b border-[#E8E2DE]">
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Actor</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase tracking-wider text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2DE]">
                {recentActivity.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[#6B6B6B] text-[13px]">
                      No recent grade activity
                    </td>
                  </tr>
                ) : (
                  recentActivity.map((a) => (
                    <tr key={a.id} className="hover:bg-[#FFF1C2]/30 transition-colors">
                      <td className="px-4 py-3 text-[#1B1F3B] font-medium">{a.actor}</td>
                      <td className="px-4 py-3"><StatusPill status={a.action === 'LOCK' ? 'Locked' : a.action === 'UNLOCK' ? 'Unlocked' : 'Edited'} /></td>
                      <td className="px-4 py-3 text-[#1B1F3B]">{a.entity}</td>
                      <td className="px-4 py-3 text-[#6B6B6B] text-right">{a.time}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
