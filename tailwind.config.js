/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ProLift brand palette — override centrally later if branding changes
        brand: {
          50: '#eff3f8',
          100: '#d7e2ee',
          500: '#2f5c8f',
          600: '#244a75',
          700: '#1b3a5c',
          900: '#0e2138',
        },
        accent: '#c2822a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
