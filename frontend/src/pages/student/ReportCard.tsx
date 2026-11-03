import { DashboardLayout } from '../../components/DashboardLayout';
import { STUDENT_NAV } from '../../constants/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

export default function ReportCard() {
  const { data: reportCard, isLoading } = useQuery({
    queryKey: ['student', 'report-card'],
    queryFn: async () => {
      const res = await api.get<{ reportCard: any }>('/student/report-card');
      return res.data.reportCard;
    },
  });

  const handleDownload = async () => {
    try {
      const response = await api.get('/student/report-card/download', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Form138-ReportCard.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert('Report card download will be available soon. Contact your teacher for assistance.');
    }
  };

  return (
    <DashboardLayout
      title="Report card"
      subtitle="Download your official Form 138 report card."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-8">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-4">Form 138 / Report Card</h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : reportCard ? (
            <>
              <div className="mb-6 p-4 bg-[#F4F2EF] rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <p className="text-[11px] text-[#6B6B6B] mb-1">Student Name</p>
                    <p className="font-semibold text-[#1B1F3B]">
                      {reportCard.student?.firstName} {reportCard.student?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B6B6B] mb-1">LRN</p>
                    <p className="font-semibold text-[#1B1F3B]">{reportCard.student?.lrn}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B6B6B] mb-1">Grade Level</p>
                    <p className="font-semibold text-[#1B1F3B]">{reportCard.gradeLevel}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#6B6B6B] mb-1">General Average</p>
                    <p className="text-[18px] font-800 text-[#6B0A0F]">{reportCard.generalAverage || '—'}</p>
                  </div>
                </div>
              </div>

              <p className="text-[13px] text-[#6B6B6B] mb-6">
                Your official report card contains all your grades for the entire school year. Download it for your records.
              </p>

              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold hover:bg-[#5A0808]"
              >
                Download Report Card (PDF)
              </button>

              <p className="text-[11px] text-[#6B6B6B] mt-4 text-center">
                This report card is generated based on your current grades. Final grades will be available at the end of the school year.
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-[#6B6B6B] mb-4">No report card data available yet.</p>
              <p className="text-[12px] text-[#6B6B6B]">
                Report cards will be generated once all quarters are completed.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
          <p className="text-[11px] font-semibold text-[#8a6d00] uppercase tracking-wider mb-3">
            About Form 138
          </p>
          <ul className="space-y-2 text-[12px] text-[#8a6d00]">
            <li>• Official permanent record</li>
            <li>• Required for enrollment</li>
            <li>• Shows all subject grades</li>
            <li>• Includes general average</li>
            <li>• Valid for school transfers</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
