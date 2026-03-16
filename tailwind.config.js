/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calming Sage & Earth Palette
        sage: {
          50: '#f6f8f6',
          100: '#e8ede8',
          200: '#D1DCCF',
          300: '#b8c9b5',
          400: '#9ab396',
          500: '#7d9c78',
          600: '#638560',
          700: '#506b4e',
          800: '#425641',
          900: '#384736',
        },
        earth: {
          50: '#faf9f7',
          100: '#f5f3ef',
          200: '#ebe7e0',
          300: '#ddd6ca',
          400: '#c9bfad',
          500: '#b5a790',
          600: '#a08e73',
          700: '#86745e',
          800: '#6d5e4d',
          900: '#5a4e40',
        },
        slate: {
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Cycle phase colors (softer, earthy tones)
        follicular: '#7d9c78',
        ovulation: '#d4a574',
        luteal: '#a08e73',
        menstrual: '#c48f8f',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
