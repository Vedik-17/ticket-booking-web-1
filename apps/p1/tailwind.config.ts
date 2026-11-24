import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        reserva: {
          DEFAULT: '#742F42', // Warm Editorial Burgundy
          dark: '#582130',
          deep: '#171D2B', // Midnight Navy
          light: '#FBF7F0',
          pill: '#F4EBDD', // Warm Cream
          border: '#E8DFD3',
          subtle: '#FAF4EB',
          accent: '#B64A38', // Terracotta
          gold: '#D5B77B',   // Muted Gold
          navy: '#171D2B',   // Midnight Navy
          dusty: '#8293A0',  // Dusty Blue
        },
        cream: {
          DEFAULT: '#F4EBDD',
          light: '#FBF7F0',
          dark: '#E8DFD3',
        },
        navy: {
          DEFAULT: '#171D2B',
          light: '#283145',
        },
        terracotta: {
          DEFAULT: '#B64A38',
          hover: '#9E3E2E',
        },
        burgundy: {
          DEFAULT: '#742F42',
          hover: '#5C2434',
        },
        gold: {
          DEFAULT: '#D5B77B',
        },
        dusty: {
          DEFAULT: '#8293A0',
        },
        oled: '#080808',
        charcoal: '#171D2B',
        surface: '#FFFFFF',
        'surface-subtle': '#FBF7F0',
        accent: {
          DEFAULT: '#742F42',
          glow: '#B64A38',
          dim: 'rgba(116, 47, 66, 0.12)',
        },
        grey: {
          secondary: '#5C6470',
          muted: '#8293A0',
        },
      },
      fontFamily: {
        serif: [
          '"DM Serif Display"',
          'Playfair Display',
          'Georgia',
          'serif',
        ],
        sans: [
          '"Plus Jakarta Sans"',
          'Manrope',
          'Inter',
          '-apple-system',
          'sans-serif',
        ],
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
        'glass-xl': '24px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-orange': '0 8px 32px 0 rgba(255, 106, 26, 0.20)',
        'glass-subtle': '0 4px 20px 0 rgba(0, 0, 0, 0.25)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
    },
  },
  plugins: [],
};

export default config;

