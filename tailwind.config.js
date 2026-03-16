/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sage green palette (primary)
        sage: {
          50: '#f6f7f5',
          100: '#e8ebe5',
          200: '#d4dace',
          300: '#b5c0ab',
          400: '#95a686',
          500: '#7a8e6a',
          600: '#5f7252',
          700: '#4b5a42',
          800: '#3e4a38',
          900: '#353f31',
        },
        // Warm off-white palette (secondary/background)
        cream: {
          50: '#fefdfb',
          100: '#fdf9f3',
          200: '#faf3e8',
          300: '#f5e9d6',
          400: '#eddcc0',
          500: '#e2c9a4',
        },
        // Phase colors (refined, muted)
        phase: {
          menstrual: '#c77d7d',
          'menstrual-light': '#f5e8e8',
          follicular: '#7da3c7',
          'follicular-light': '#e8f0f5',
          ovulation: '#c7a77d',
          'ovulation-light': '#f5f0e8',
          luteal: '#a37dc7',
          'luteal-light': '#f0e8f5',
        },
        // Legacy support
        primary: {
          50: '#f6f7f5',
          100: '#e8ebe5',
          500: '#7a8e6a',
          600: '#5f7252',
          700: '#4b5a42',
        },
        follicular: '#7da3c7',
        ovulation: '#c7a77d',
        luteal: '#a37dc7',
        menstrual: '#c77d7d',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -10px rgba(0, 0, 0, 0.1), 0 2px 10px -2px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
