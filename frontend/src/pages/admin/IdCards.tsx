import { DashboardLayout } from '../../components/DashboardLayout';
import { ADMIN_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function IdCards() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'id-assets'],
    queryFn: async () => {
      const res = await api.get<{ idAssets: any[] }>('/admin/id-assets?limit=1000');
      return res.data.idAssets;
    },
  });

  return (
    <DashboardLayout title="ID Photos & Signatures" subtitle="Review uploaded ID assets" nav={ADMIN_NAV} schoolYear="SY 2024–2025">
      <div className="col-span-12">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-6">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">ID Assets</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : data?.length === 0 ? (
            <p className="text-center text-[#6B6B6B] py-8">No ID photos or signatures uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.map(asset => (
                <div key={asset.id} className="border border-[#E8E2DE] rounded-lg p-4">
                  <p className="text-[13px] font-semibold text-[#1B1F3B]">{asset.student?.firstName} {asset.student?.lastName}</p>
                  <p className="text-[11px] text-[#6B6B6B]">{asset.student?.lrn}</p>
                  <div className="mt-2">
                    {asset.photoUrl && <p className="text-[11px] text-green-600">✓ Photo uploaded</p>}
                    {asset.signatureUrl && <p className="text-[11px] text-green-600">✓ Signature uploaded</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
