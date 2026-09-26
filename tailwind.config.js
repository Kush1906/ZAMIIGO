/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
      colors: {
        zamiigo: {
          teal: {
            DEFAULT: '#073B4C',
            dark: '#20393E', // Wilderness North Deep Forest
            light: '#2C4F56', // Wilderness North Pine
          },
          amber: {
            DEFAULT: '#FFB600', // Wilderness North Vibrant Amber
            hover: '#e5a400',
            light: '#fff3cd',
          },
          ice: {
            DEFAULT: '#EEF4F8',
            dark: '#d1ecf1',
            canvas: '#F0F4F8',
          }
        }
      }
    },
  },
  plugins: [],
}
