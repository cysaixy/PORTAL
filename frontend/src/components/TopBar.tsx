interface TopBarProps {
  title: string;
  subtitle: string;
  schoolYear?: string;
  onMenuToggle?: () => void;
}

export function TopBar({ title, subtitle, schoolYear = 'SY 2024–2025 · Current', onMenuToggle }: TopBarProps) {
  return (
    <header className="bg-white border-b border-[#E8E2DE] sticky top-0 z-30 px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-[8px] text-navy hover:bg-[#FFF1C2] transition-colors focus-visible:ring-2 focus-visible:ring-[#6B0A0F]"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-[20px] font-800 text-[#1B1F3B]">{title}</h1>
            {subtitle && <p className="text-[12px] text-[#6B6B6B] leading-tight">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF1C2] text-[#8a6d00] text-[11px] font-semibold">
            {schoolYear}
          </span>
        </div>
      </div>
    </header>
  );
}
