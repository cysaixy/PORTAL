/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Existing primary blue kept for backward compatibility
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // LOA Portal brand colors (CSU-inspired)
        brand: '#C4161C',           // Primary brand red
        'brand-deep': '#6E0B0F',    // Deep maroon
        'brand-mist': '#F0BDBD',    // Soft pink-red
        gold: '#FFD21F',            // Primary gold
        'gold-soft': '#FFF4C2',     // Soft yellow
        'gold-line': '#F2DC85',     // Gold accent line
        'gold-ink': '#5A4300',      // Dark gold text
        ink: '#1B1F3B',             // Primary text color (navy)
        canvas: '#F6F4F2',          // Background off-white
        line: '#E8E2DE',            // Border/divider color
        muted: '#5E5A63',           // Secondary text
        // Legacy colors for backward compatibility
        maroon: '#6B0A0F',
        'maroon-deep': '#4A070A',
        yellow: '#FFD21F',
        'yellow-dark': '#E6C200',
        red: '#C8161D',
        'red-soft': '#F8E7E7',
        cream: '#F4F2EF',
        'pale-yellow': '#FFF1C2',
        navy: '#1B1F3B',
        'navy-soft': '#2A2F4E',
        green: '#15803d',
        'green-soft': '#dcfce7',
        blue: '#3730a3',
        'blue-soft': '#eef2ff',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '13': '13px',
      },
      borderRadius: {
        card: '16px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
