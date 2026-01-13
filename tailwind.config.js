module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          50: 'rgba(var(--color-paper-50) / <alpha-value>)',
          100: 'rgba(var(--color-paper-100) / <alpha-value>)',  // Base background
          200: 'rgba(var(--color-paper-200) / <alpha-value>)',
          300: 'rgba(var(--color-paper-300) / <alpha-value>)',
          400: 'rgba(var(--color-paper-400) / <alpha-value>)',
          500: 'rgba(var(--color-paper-500) / <alpha-value>)',
          600: 'rgba(var(--color-paper-600) / <alpha-value>)',
          700: 'rgba(var(--color-paper-700) / <alpha-value>)',
          800: 'rgba(var(--color-paper-800) / <alpha-value>)',
          900: 'rgba(var(--color-paper-900) / <alpha-value>)',
        },
        ink: {
          50: 'rgba(var(--color-ink-50) / <alpha-value>)',
          100: 'rgba(var(--color-ink-100) / <alpha-value>)',
          200: 'rgba(var(--color-ink-200) / <alpha-value>)',
          300: 'rgba(var(--color-ink-300) / <alpha-value>)',
          400: 'rgba(var(--color-ink-400) / <alpha-value>)',
          500: 'rgba(var(--color-ink-500) / <alpha-value>)',
          600: 'rgba(var(--color-ink-600) / <alpha-value>)',
          700: 'rgba(var(--color-ink-700) / <alpha-value>)',
          800: 'rgba(var(--color-ink-800) / <alpha-value>)',
          900: 'rgba(var(--color-ink-900) / <alpha-value>)', // Soft black for text
          950: 'rgba(var(--color-ink-950) / <alpha-value>)', // Darker black for headings
        },
        // Keep existing grays but map them to softer tones if needed, or just keep as is for compatibility
        gray: {
          50: 'rgba(var(--color-gray-50) / <alpha-value>)',
          100: 'rgba(var(--color-gray-100) / <alpha-value>)',
          200: 'rgba(var(--color-gray-200) / <alpha-value>)',
          300: 'rgba(var(--color-gray-300) / <alpha-value>)',
          400: 'rgba(var(--color-gray-400) / <alpha-value>)',
          500: 'rgba(var(--color-gray-500) / <alpha-value>)',
          600: 'rgba(var(--color-gray-600) / <alpha-value>)',
          700: 'rgba(var(--color-gray-700) / <alpha-value>)',
          800: 'rgba(var(--color-gray-800) / <alpha-value>)',
          900: 'rgba(var(--color-gray-900) / <alpha-value>)',
        },
        blue: {
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
        },
        // Finance-themed accents
        money: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        }
      },
      fontFamily: {
        sans: ['"Roboto"', '"Outfit"', '"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['"Outfit"', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '2.5rem',
      },
      screens: {
        'xs': '475px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
        'glow-lg': '0 0 30px rgba(99, 102, 241, 0.4)',
        'card': '0 8px 30px rgb(0, 0, 0, 0.04)',
        'card-hover': '0 8px 30px rgb(0, 0, 0, 0.08)',
        'card-top': '0 -8px 30px rgb(0, 0, 0, 0.04)',
      },
      backdropBlur: {
        xs: '2px',
      }
    }
  },
  plugins: []
}