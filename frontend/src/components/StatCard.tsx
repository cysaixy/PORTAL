interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: 'maroon' | 'yellow' | 'white';
  children?: React.ReactNode;
}

export function StatCard({ label, value, sublabel, variant = 'white', children }: StatCardProps) {
  const variants: Record<string, string> = {
    maroon: 'bg-[#6B0A0F] text-white',
    yellow: 'bg-[#FFF1C2] text-[#8a6d00]',
    white: 'bg-white text-[#1B1F3B]',
  };

  const valueColor = variant === 'maroon' ? 'text-[#FFD21F]' : variant === 'yellow' ? 'text-[#8a6d00]' : 'text-[#1B1F3B] font-800';

  return (
    <div className={`${variants[variant]} border border-[#E8E2DE] rounded-[16px] p-6 flex flex-col`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-1 {labelColor}">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-[32px] font-800 ${valueColor}`}>{value}</span>
      </div>
      {sublabel && <p className="text-[11px] {variant === 'maroon' ? 'text-[#F0BDBD]/80' : 'text-[#6B6B6B]'}" >{sublabel}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
