const colors = require('tailwindcss/colors');

const config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      flex: {
        '2': '2 2 0%',
        '3': '3 3 0%'
      },
      fontFamily: {
        mono: 'VT323'
      },
      fontSize: {
        tiny: '12px',
        xxs: '16px'
        },
      rotate: {
        30: '30deg'
      },
      gridTemplateColumns: {
        '20': 'repeat(20, minmax(0, 1fr))',
      },
      animation: {
        'ping-slow': 'ping 3s ease infinite',
        'spin-slow': 'spin 3s linear infinite',
        'spin-slow-2': 'spin 4s linear infinite',
        'full-pulse': 'full-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 3.2s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'shake-fast': 'shake 2s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
      },
      dropShadow: {
        text: '2px 2px 0 rgba(0, 0, 0, 0.9)',
        grave: '1px 1px 0 rgba(0, 0, 0, 0.5)',
      },
      scale: {
        65: '0.65',
        200: '2',
        250: '2.5'
      },
      colors: {
        // El naranja de la web original pasa a ser el rojo de Lockedex, y el índigo, el turquesa de las
        // pantallas LCD: así los componentes heredados ya no traen sus colores
        orange: {
          50: '#fff1f3', 100: '#ffe0e5', 200: '#ffc6cf', 300: '#ff9aab', 400: '#ff5c78',
          500: '#f5294a', 600: '#dc0a2d', 700: '#b80624', 800: '#8b0a1e', 900: '#6b0b1b'
        },
        indigo: {
          50: '#eefbff', 100: '#d6f4ff', 200: '#b0eaff', 300: '#8ee8ff', 400: '#4fd0f5',
          500: '#29b6f6', 600: '#1d8fc0', 700: '#1d4a5e', 800: '#12303f', 900: '#0b1f29'
        },
        lime: colors.lime,
        gray: colors.neutral
      }
    }
  },

  darkMode: 'class',
  plugins: [
    require('@tailwindcss/line-clamp'),
  ]
};

module.exports = config;
