import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        oled: '#080808',
        charcoal: '#111111',
        surface: '#181818',
        'surface-subtle': '#222222',
        accent: {
          DEFAULT: '#FF6A1A',
          glow: '#FF9A45',
          dim: 'rgba(255, 106, 26, 0.15)',
        },
        grey: {
          secondary: '#A3A3A3',
          muted: '#666666',
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
