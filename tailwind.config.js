/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'neue-haas-grotesk-display',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif'
        ],
      },
    },
  },
  plugins: [],
};