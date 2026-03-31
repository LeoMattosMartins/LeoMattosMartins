/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'galactic-blue': '#000033',
        'galactic-cyan': '#0000FF',
        'deep-space': '#020617'
      },
      fontFamily: {
        mono: ['Monocraft', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
};
