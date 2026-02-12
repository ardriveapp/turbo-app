/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'sans-serif'],
      heading: ['Besley Variable', 'Besley', 'serif'],
      body: ['Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    extend: {
      colors: {
        // ar.io brand colors (light mode)
        primary: 'rgb(var(--color-primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--color-card) / <alpha-value>)', // Text on primary backgrounds
        lavender: 'rgb(var(--color-lavender) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        background: 'rgb(var(--color-background) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        'code-surface': 'rgb(var(--color-code-surface) / <alpha-value>)', // Code block backgrounds

        // Legacy mappings for gradual migration (will be removed)
        // These map old token names to new values for compatibility
        page: 'rgb(var(--color-background) / <alpha-value>)',
        canvas: 'rgb(var(--color-card) / <alpha-value>)',
        surface: 'rgb(var(--color-background) / <alpha-value>)',
        'surface-elevated': 'rgb(var(--color-card) / <alpha-value>)',
        'header-bg': 'rgb(var(--color-background) / <alpha-value>)',
        default: 'rgb(var(--color-border) / <alpha-value>)',
        'fg-muted': 'rgb(var(--color-foreground) / <alpha-value>)',
        link: 'rgb(var(--color-foreground) / 0.8)',

        // Status colors (semantic colors with opacity support)
        error: 'rgb(var(--color-error) / <alpha-value>)',
        success: 'rgb(var(--color-success) / <alpha-value>)',
        warning: 'rgb(var(--color-warning) / <alpha-value>)',
        info: 'rgb(var(--color-info) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
