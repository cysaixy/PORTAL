/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Lyceum of Alcala brand
        brand: {
          50: '#FBF1F1',
          100: '#F6DFDF',
          200: '#EDBDBE',
          300: '#DE8F91',
          500: '#C4161C',
          600: '#A3121A',
          700: '#851016',
          800: '#6B0A0F',
          900: '#4A070A',
        },
        gold: {
          50: '#FFFBEA',
          100: '#FFF4C2',
          200: '#FFE98A',
          400: '#FFD21F',
          500: '#EDBE00',
          700: '#8A6D00',
          900: '#5A4300',
        },
        ink: { DEFAULT: '#1B1F3B', soft: '#3A3F5C' },
        canvas: '#F6F4F2',
        line: { DEFAULT: '#E8E2DE', strong: '#D6CEC8' },
        muted: '#6B6670',
        success: { 50: '#ECFDF3', 600: '#15803D', 700: '#166534' },
        warn: { 50: '#FFF7E6', 600: '#B45309', 700: '#92400E' },
        danger: { 50: '#FEF2F2', 600: '#DC2626', 700: '#B91C1C' },
        info: { 50: '#EEF2FF', 600: '#4F46E5', 700: '#3730A3' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,31,59,0.04), 0 1px 1px rgba(27,31,59,0.02)',
        pop: '0 12px 32px -8px rgba(27,31,59,0.22), 0 4px 8px -4px rgba(27,31,59,0.08)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
        'slide-in': 'slide-in 220ms cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
