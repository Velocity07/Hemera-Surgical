/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        or: {
          darkest: '#030508',
          bg: '#07090E',
          panel: '#0B0F17',
          surface: '#111722',
          border: '#1A2333',
          borderLight: '#2A364E',
        },
        med: {
          ecg: '#00F59B',       // Lead II Emerald (500nm)
          spo2: '#00E5FF',      // Pleth Cyan
          abp: '#FFB300',       // Arterial Amber
          bis: '#C084FC',       // BIS Purple
          co2: '#FFE600',       // Capnography Yellow
          alert: '#FF2E54',     // Critical Red
          warning: '#FFAA00',   // Caution Amber
          safe: '#00F59B',      // Normal Green
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}