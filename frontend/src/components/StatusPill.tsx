interface StatusPillProps {
  status: string;
  className?: string;
}

const statusMap: Record<string, { bg: string; text: string }> = {
  Active: { bg: '#dcfce7', text: '#15803d' },
  Locked: { bg: '#dcfce7', text: '#15803d' },
  Passed: { bg: '#dcfce7', text: '#15803d' },
  Ready: { bg: '#dcfce7', text: '#15803d' },
  Uploaded: { bg: '#dcfce7', text: '#15803d' },
  Edited: { bg: '#FFF1C2', text: '#8a6d00' },
  'In progress': { bg: '#FFF1C2', text: '#8a6d00' },
  Missing: { bg: '#FFF1C2', text: '#8a6d00' },
  Pinned: { bg: '#FFF1C2', text: '#8a6d00' },
  Unread: { bg: '#FFF1C2', text: '#8a6d00' },
  'No photo/signature': { bg: '#FFF1C2', text: '#8a6d00' },
  Inactive: { bg: '#FFF1C2', text: '#8a6d00' },
  Unlocked: { bg: '#eef2ff', text: '#3730a3' },
  Core: { bg: '#eef2ff', text: '#3730a3' },
  Create: { bg: '#eef2ff', text: '#3730a3' },
  Admin: { bg: '#eef2ff', text: '#3730a3' },
  Unlock: { bg: '#F8E7E7', text: '#C8161D' },
  'Access denied': { bg: '#F8E7E7', text: '#C8161D' },
};

export function StatusPill({ status, className }: StatusPillProps) {
  const style = statusMap[status] || { bg: '#F4F2EF', text: '#6B6B6B' };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap bg-${style.bg.slice(1)} text-${style.text.slice(1)} ${className ?? ''}`}
    >
      {status}
    </span>
  );
}
