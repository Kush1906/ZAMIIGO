/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        zamiigo: {
          teal: {
            DEFAULT: '#073B4C',
            dark: '#003845',
            light: '#115d75',
          },
          amber: {
            DEFAULT: '#F0A500',
            hover: '#d99200',
            light: '#fff3cd',
          },
          ice: {
            DEFAULT: '#EEF4F8',
            dark: '#d1ecf1',
            canvas: '#F7F9FA',
          }
        }
      }
    },
  },
  plugins: [],
}
