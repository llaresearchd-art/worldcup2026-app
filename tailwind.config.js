/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          deep:    '#0C2218',
          dark:    '#11301F',
          DEFAULT: '#1B4332',
          mid:     '#2D6A4F',
          light:   '#40916C',
        },
        chalk:      '#F8F7F2',
        ink:        '#16191A',
        floodlight: '#F4A300',
        goal:       '#D62828',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body:    ['var(--font-body)',    'sans-serif'],
        score:   ['var(--font-score)',   'monospace'],
      },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.3' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(-6px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        popIn: {
          '0%':   { transform: 'scale(0.92)', opacity: '0' },
          '70%':  { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)',    opacity: '1' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        countUp: {
          '0%':   { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',   opacity: '1' },
        },
      },
      animation: {
        pulseLive: 'pulseLive 1.4s ease-in-out infinite',
        slideUp:   'slideUp 0.3s cubic-bezier(0.32,0.72,0,1) forwards',
        slideIn:   'slideIn 0.25s ease-out forwards',
        popIn:     'popIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        bounce:    'bounce 0.6s ease-in-out',
        shimmer:   'shimmer 1.5s infinite',
        countUp:   'countUp 0.4s cubic-bezier(0.32,0.72,0,1) forwards',
      },
      backgroundImage: {
        'stadium': 'radial-gradient(ellipse 120% 60% at 50% 0%, #2D6A4F 0%, #1B4332 40%, #0C2218 100%)',
        'card-floodlit': 'linear-gradient(160deg, #2D6A4F 0%, #1B4332 60%, #0C2218 100%)',
        'gold-shimmer': 'linear-gradient(135deg, #F4A300 0%, #FFD166 50%, #F4A300 100%)',
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(244,163,0,0.25)',
        'glow-red':  '0 0 20px rgba(214,40,40,0.3)',
        'card':      '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover':'0 8px 32px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
