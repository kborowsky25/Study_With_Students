/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#e8edf5',
          100: '#c7d0e6',
          200: '#8fa0c4',
          300: '#5670a3',
          400: '#2a4482',
          500: '#1b263b',
          600: '#161f30',
          700: '#111826',
          800: '#0c121b',
          900: '#070b11',
        },
        coral: {
          50:  '#fff0ee',
          100: '#ffd6d1',
          200: '#ffaca3',
          300: '#ff8275',
          400: '#ff725e',
          500: '#ff5742',
          600: '#e5432e',
          700: '#cc301b',
          800: '#b21e0a',
          900: '#990d00',
        },
        slate: {
          350: '#cfd8dc',
          450: '#b0bec5',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
