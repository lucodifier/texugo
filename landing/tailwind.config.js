/** @type {import('tailwindcss').Config} */
export default {
  content: ['./public/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#0b0d12', 800: '#12151c', 700: '#1a1e28', 600: '#262b38' },
        badger: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
};
