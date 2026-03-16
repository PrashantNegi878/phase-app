/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
        },
        follicular: '#3b82f6',
        ovulation: '#f59e0b',
        luteal: '#8b5cf6',
        menstrual: '#ef4444',
      },
    },
  },
  plugins: [],
}
