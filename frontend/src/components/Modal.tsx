interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white rounded-[16px] border border-[#E8E2DE] shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[16px] font-800 text-[#1B1F3B]">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-[8px] text-[#6B6B6B] hover:bg-[#FFF1C2] focus-visible:ring-2 focus-visible:ring-[#6B0A0F]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
