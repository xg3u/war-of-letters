// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        game: {
          purple: '#1a0b2e',
          orange: '#ff4b2b',
          accent: '#d377e3',
          gold: '#fbbf24'
        }
      },
      animation: {
        'glow-pulse': 'glow 2s infinite alternate',
      },
      keyframes: {
        glow: {
          'from': { 'box-shadow': '0 0 10px #ff4b2b' },
          'to': { 'box-shadow': '0 0 30px #d377e3' }
        }
      }
    },
  },
  plugins: [],
}