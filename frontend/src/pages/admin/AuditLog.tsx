import { DashboardLayout } from '../../components/DashboardLayout';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function AuditLog() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => {
      const res = await api.get<{ auditLogs: any[] }>('/admin/audit-logs?limit=100');
      return res.data.auditLogs;
    },
  });

  return (
    <DashboardLayout title="Audit Log" subtitle="Track all administrative actions" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">Audit Log</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <div className="border border-[#E8E2DE] rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F4F2EF]">
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Time</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">User</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Action</th>
                    <th className="px-4 py-3 text-[11px] font-semibold text-[#6B6B6B] uppercase">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E2DE]">
                  {logs?.map(log => (
                    <tr key={log.id} className="hover:bg-[#FFF1C2]/30">
                      <td className="px-4 py-3 text-[#6B6B6B]">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-[#1B1F3B]">{log.user?.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-semibold ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          'bg-red-100 text-red-800'
                        }`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-[#6B6B6B]">{log.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
