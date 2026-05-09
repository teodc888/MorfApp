import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'surface-bright': '#faf5ee',
        'outline': '#9a9088',
        'surface-container-lowest': '#ffffff',
        'on-primary': '#ffffff',
        'tertiary-container': '#d47070',
        'on-tertiary': '#ffffff',
        'outline-variant': '#d8d0c8',
        'surface-dim': '#dcd6cc',
        'surface-container-high': '#ece6dc',
        'background': '#faf5ee',
        'inverse-on-surface': '#faf5ee',
        'secondary': '#78706a',
        'surface': '#faf5ee',
        'tertiary': '#8c3c3c',
        'on-primary-fixed-variant': '#8a4518',
        'primary-container': '#e08850',
        'on-secondary-container': '#605850',
        'surface-container': '#f2ece4',
        'surface-tint': '#c2652a',
        'on-surface': '#3a302a',
        'surface-container-low': '#f6f0e8',
        'on-background': '#3a302a',
        'primary': '#c2652a',
        'on-surface-variant': '#605850',
        'secondary-container': '#eae2da',
        'on-error': '#ffffff',
        'surface-container-highest': '#e6e0d6',
        'primary-fixed-dim': '#f0a878',
        'primary-fixed': '#fbe8d8',
        'on-primary-container': '#fbe8d8',
        'surface-variant': '#ece6dc',
        'error': '#c0392b',
        'on-secondary': '#ffffff',
      },
      fontFamily: {
        headline: ['var(--font-headline)', 'serif'],
        display: ['var(--font-headline)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        label: ['var(--font-body)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
