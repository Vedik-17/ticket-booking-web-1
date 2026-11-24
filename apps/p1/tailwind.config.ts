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
          DEFAULT: '#6B1736',
          dark: '#4E0F26',
          deep: '#380B1C',
          light: '#FFF5F7',
          pill: '#FDF2F4',
          border: '#F0E6E8',
          subtle: '#FBF9FA',
          accent: '#D93B68',
        },
        oled: '#080808',
        charcoal: '#111111',
        surface: '#FFFFFF',
        'surface-subtle': '#FBF9FA',
        accent: {
          DEFAULT: '#6B1736',
          glow: '#D93B68',
          dim: 'rgba(107, 23, 54, 0.12)',
        },
        grey: {
          secondary: '#666666',
          muted: '#8E8E93',
        },
      },
      fontFamily: {
        sans: [
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
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

