/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'selector',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: ['Rubik', 'sans-serif'],
    },
    extend: {
      colors: {
        canvas: '#171717',
        surface: '#1F1F1F',
        default: '#333',
        'fg-muted': '#ededed',
        'fg-disabled': '#757575',
        'fg-on-disabled': '#E0E0E0',
        'accent-disabled': '#757575',
        error: '#f00',
        link: '#A3A3AD',
        high: '#CACAD6',
        // Additional turbo colors
        turbo: {
          red: '#FE0230',
          blue: '#3142C4',
          green: '#18A957',
        }
      },
    },
  },
  plugins: [],
};