interface ProgressBarProps {
  value: number;
  max?: number;
  status?: 'ok' | 'warning' | 'brand' | 'maroon';
  className?: string;
}

export function ProgressBar({ value, max = 100, status, className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  let fill: string;
  if (status === 'ok') {
    fill = 'bg-[#15803d]';
  } else if (status === 'warning') {
    fill = 'bg-[#F59E0B]';
  } else if (status === 'maroon') {
    fill = 'bg-[#6B0A0F]';
  } else if (pct < 60) {
    fill = 'bg-[#F59E0B]';
  } else {
    fill = 'bg-[#C8161D]';
  }
  return (
    <div className={`w-full h-[10px] rounded-full bg-[#E8E2DE] ${className}`}>
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
