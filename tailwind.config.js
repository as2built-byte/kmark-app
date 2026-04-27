/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kmark: {
          red:           '#c0392b',
          'red-hover':   '#a93226',
          dark:          '#0a0a0a',
          card:          '#131313',
          'card-hover':  '#1c1c1c',
          gold:          '#b8962e',
          'gold-hover':  '#a07a20',
          'gold-dim':    'rgba(184,150,46,0.18)',
          primary:       '#27ae60',
          'primary-hover': '#219a52',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
