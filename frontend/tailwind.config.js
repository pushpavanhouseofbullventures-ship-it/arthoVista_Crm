/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        logoOrange: {
          DEFAULT: '#fe7c02',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#fe7c02',
          600: '#ea580c',
          700: '#c2410c'
        },
        logoBlue: {
          DEFAULT: '#0062d1',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#0062d1',
          600: '#0052b0',
          700: '#00418c'
        },
        logoGreen: {
          DEFAULT: '#028825',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          500: '#028825',
          600: '#15803d',
          700: '#166534'
        }
      },
      backgroundImage: {
        'logo-45': 'linear-gradient(135deg, #fe7c02 0%, #0062d1 50%, #028825 100%)',
        'logo-45-reverse': 'linear-gradient(45deg, #028825 0%, #0062d1 50%, #fe7c02 100%)',
        'logo-orange-45': 'linear-gradient(135deg, #fe7c02 0%, #ea580c 100%)',
        'logo-blue-45': 'linear-gradient(135deg, #0062d1 0%, #1d4ed8 100%)',
        'logo-green-45': 'linear-gradient(135deg, #028825 0%, #16a34a 100%)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'clean': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'clean-md': '0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.03)',
        'clean-lg': '0 12px 28px -6px rgba(0, 0, 0, 0.06), 0 6px 12px -4px rgba(0, 0, 0, 0.03)',
        'clean-xl': '0 20px 35px -10px rgba(0, 0, 0, 0.08), 0 10px 15px -5px rgba(0, 0, 0, 0.04)',
        'luminous': '0 0 0 1px rgba(0, 0, 0, 0.04), 0 2px 4px 0 rgba(0, 0, 0, 0.02), 0 12px 24px -4px rgba(0, 0, 0, 0.04)',
        'luminous-hover': '0 0 0 1px rgba(59, 130, 246, 0.15), 0 8px 30px -4px rgba(59, 130, 246, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'logo-glow': '0 4px 20px -2px rgba(0, 98, 209, 0.25), 0 2px 10px -2px rgba(254, 124, 2, 0.2)',
      }
    },
  },
  plugins: [],
}

