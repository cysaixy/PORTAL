// LOA Portal Design System - matches the redesign spec
// Colors: deep maroon (#6B0A0F), bright yellow (#FFD21F), red (#C8161D),
// cream (#F4F2EF), white, pale yellow (#FFF1C2), navy (#1B1F3B)

export const colors = {
  maroon: '#6B0A0F',
  maroonDeep: '#4A070A',
  yellow: '#FFD21F',
  yellowDark: '#E6C200',
  red: '#C8161D',
  redSoft: '#F8E7E7',
  cream: '#F4F2EF',
  white: '#FFFFFF',
  paleYellow: '#FFF1C2',
  navy: '#1B1F3B',
  navySoft: '#2A2F4E',
  muted: '#6B6B6B',
  line: '#E8E2DE',
  green: '#15803d',
  greenSoft: '#dcfce7',
  blue: '#3730a3',
  blueSoft: '#eef2ff',
};

export const statusColors: Record<string, { bg: string; text: string }> = {
  Active: { bg: colors.greenSoft, text: colors.green },
  Locked: { bg: colors.greenSoft, text: colors.green },
  Passed: { bg: colors.greenSoft, text: colors.green },
  Ready: { bg: colors.greenSoft, text: colors.green },
  Uploaded: { bg: colors.greenSoft, text: colors.green },
  Edited: { bg: colors.paleYellow, text: '#8a6d00' },
  'In progress': { bg: colors.paleYellow, text: '#8a6d00' },
  Missing: { bg: colors.paleYellow, text: '#8a6d00' },
  Pinned: { bg: colors.paleYellow, text: '#8a6d00' },
  Unread: { bg: colors.paleYellow, text: '#8a6d00' },
  'No photo/signature': { bg: colors.paleYellow, text: '#8a6d00' },
  Inactive: { bg: colors.paleYellow, text: '#8a6d00' },
  Unlocked: { bg: colors.blueSoft, text: colors.blue },
  Core: { bg: colors.blueSoft, text: colors.blue },
  Create: { bg: colors.blueSoft, text: colors.blue },
  Admin: { bg: colors.blueSoft, text: colors.blue },
  Unlock: { bg: colors.redSoft, text: colors.red },
  'Access denied': { bg: colors.redSoft, text: colors.red },
};

export const pillClasses = {
  primary:
    'inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-full bg-[#FFD21F] text-[#1B1F3B] text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#6B0A0F] focus-visible:ring-offset-2',
  secondary:
    'inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-full border-2 border-[#E8E2DE] bg-white text-[#1B1F3B] text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#6B0A0F] focus-visible:ring-offset-2',
  ghost:
    'inline-flex items-center justify-center px-4 py-2 min-h-[44px] rounded-full text-[#1B1F3B] text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#6B0A0F] focus-visible:ring-offset-2',
};

export const cardClasses = 'bg-white border border-[#E8E2DE] rounded-[16px] p-6';
