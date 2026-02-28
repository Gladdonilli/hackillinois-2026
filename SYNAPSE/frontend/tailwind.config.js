/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#0A0A0A',
        border: '#1F1F1F',
        text: '#EDEDED',
        dim: '#666666',
        accent: '#00FFFF',
        warn: '#FF3366',
      },
      fontFamily: {
        sans: ['Geist', 'sans-serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      screens: {
        'desktop': '1280px',
      }
    },
  },
  plugins: [],
}

