import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { STUDENT_NAV } from '../../constants/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

export default function MyId() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const queryClient = useQueryClient();

  const { data: idData, isLoading } = useQuery({
    queryKey: ['student', 'id'],
    queryFn: async () => {
      const res = await api.get<{ student: any }>('/student/profile');
      return res.data.student;
    },
  });

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && showSignaturePad) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [showSignaturePad]);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'signature.png', { type: 'image/png' });
        setSignatureFile(file);
        setShowSignaturePad(false);
      }
    });
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      if (photoFile) formData.append('photo', photoFile);
      if (signatureFile) formData.append('signature', signatureFile);
      return api.post('/student/upload-id', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'id'] });
      setPhotoFile(null);
      setSignatureFile(null);
      alert('Files uploaded successfully!');
    },
  });

  const handleUpload = () => {
    if (!photoFile && !signatureFile) {
      alert('Please select at least one file to upload.');
      return;
    }
    uploadMutation.mutate();
  };

  return (
    <DashboardLayout
      title="My ID"
      subtitle="Upload your photo and signature for your student ID."
      nav={STUDENT_NAV}
      schoolYear="SY 2024–2025"
    >
      <div className="col-span-12 lg:col-span-8">
        <div className="bg-white border border-[#E8E2DE] rounded-[16px] p-8">
          <h2 className="text-[18px] font-800 text-[#1B1F3B] mb-6">Student ID</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B0A0F]"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* ID Photo */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-2">ID Photo</label>
                  <div className="border-2 border-dashed border-[#E8E2DE] rounded-[8px] p-6 text-center">
                    {idData?.photoUrl ? (
                      <div>
                        <img
                          src={`/api${idData.photoUrl}`}
                          alt="ID Photo"
                          className="w-32 h-32 object-cover mx-auto rounded mb-2"
                        />
                        <p className="text-[11px] text-green-600 font-semibold">✓ Photo uploaded</p>
                      </div>
                    ) : photoFile ? (
                      <div>
                        <img
                          src={URL.createObjectURL(photoFile)}
                          alt="Preview"
                          className="w-32 h-32 object-cover mx-auto rounded mb-2"
                        />
                        <p className="text-[11px] text-[#6B6B6B]">Ready to upload</p>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#6B6B6B] mb-3">No photo uploaded</p>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      className="inline-block px-4 py-2 rounded-full bg-[#F4F2EF] text-[#1B1F3B] text-[12px] font-semibold cursor-pointer hover:bg-[#E8E2DE]"
                    >
                      Choose Photo
                    </label>
                  </div>
                </div>

                {/* Signature */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#1B1F3B] mb-2">Signature</label>
                  <div className="border-2 border-dashed border-[#E8E2DE] rounded-[8px] p-6 text-center">
                    {idData?.signatureUrl ? (
                      <div>
                        <img
                          src={`/api${idData.signatureUrl}`}
                          alt="Signature"
                          className="w-48 h-24 object-contain mx-auto mb-2"
                        />
                        <p className="text-[11px] text-green-600 font-semibold">✓ Signature uploaded</p>
                      </div>
                    ) : signatureFile ? (
                      <div>
                        <img
                          src={URL.createObjectURL(signatureFile)}
                          alt="Preview"
                          className="w-48 h-24 object-contain mx-auto mb-2"
                        />
                        <p className="text-[11px] text-[#6B6B6B]">Ready to upload</p>
                        <button
                          onClick={() => setSignatureFile(null)}
                          className="text-[11px] text-red-600 hover:text-red-800 mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#6B6B6B] mb-3">No signature yet</p>
                    )}
                    <div className="flex gap-2 justify-center mt-3">
                      <button
                        onClick={() => setShowSignaturePad(true)}
                        className="px-4 py-2 rounded-full bg-[#6B0A0F] text-white text-[12px] font-semibold hover:bg-[#5A0808]"
                      >
                        ✍️ Draw Signature
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSignatureFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="signature-upload"
                      />
                      <label
                        htmlFor="signature-upload"
                        className="inline-block px-4 py-2 rounded-full bg-[#F4F2EF] text-[#1B1F3B] text-[12px] font-semibold cursor-pointer hover:bg-[#E8E2DE]"
                      >
                        📁 Upload File
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {(photoFile || signatureFile) && (
                <div className="mb-6">
                  <button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="w-full py-3 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold hover:bg-[#5A0808] disabled:opacity-50"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              )}

              {uploadMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-800 mb-4">
                  Error: {(uploadMutation.error as any)?.response?.data?.error || 'Upload failed'}
                </div>
              )}

              <p className="text-[11px] text-[#6B6B6B] text-center">
                Upload your ID photo and signature to complete your student profile. These will be used for your official school ID card.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4">
        <div className="bg-[#FFF1C2] border border-[#E6C200] rounded-[16px] p-6">
          <p className="text-[11px] font-semibold text-[#8a6d00] uppercase tracking-wider mb-3">Requirements</p>
          <ul className="space-y-2 text-[12px] text-[#8a6d00]">
            <li>• 2x2 ID photo with white background</li>
            <li>• Draw signature or upload image</li>
            <li>• Maximum file size: 5MB</li>
            <li>• Accepted formats: JPG, PNG</li>
            <li>• Photo should be recent and clear</li>
            <li>• Signature should be clear and legible</li>
          </ul>
        </div>
      </div>

      {/* Signature Drawing Modal */}
      {showSignaturePad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[16px] p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-800 text-[#1B1F3B]">Draw Your Signature</h3>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="text-[#6B6B6B] hover:text-[#1B1F3B] text-[20px]"
              >
                ×
              </button>
            </div>
            
            <p className="text-[12px] text-[#6B6B6B] mb-4">
              Use your mouse or touch to draw your signature below. Write in black ink style.
            </p>

            <div className="border-2 border-[#E8E2DE] rounded-lg overflow-hidden mb-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={clearSignature}
                className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#F4F2EF]"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSignaturePad(false)}
                className="px-6 py-2.5 rounded-full border border-[#E8E2DE] text-[#1B1F3B] text-[13px] font-semibold hover:bg-[#F4F2EF]"
              >
                Cancel
              </button>
              <button
                onClick={saveSignature}
                className="px-6 py-2.5 rounded-full bg-[#6B0A0F] text-white text-[13px] font-semibold hover:bg-[#5A0808]"
              >
                Save Signature
              </button>
            </div>

            <p className="text-[11px] text-[#6B6B6B] text-center mt-4">
              💡 Tip: Sign your full name as you would on official documents
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
