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
          DEFAULT: '#6B2FB5',
          dark: '#5A28A0',
          light: '#8B4FD5',
        },
        dark: {
          DEFAULT: '#1A1A2E',
          lighter: '#2D2D44',
          darker: '#0F0F1E',
        },
      },
    },
  },
  plugins: [],
}
