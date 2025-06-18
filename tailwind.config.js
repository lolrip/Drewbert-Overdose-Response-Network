/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'space': ['Space Grotesk', 'sans-serif'],
        'manrope': ['Manrope', 'sans-serif'],
      },
      colors: {
        // Primary theme colors based on the new Drewbert palette
        primary: {
          50: '#e6f9ff',   // Very light neon blue tint
          100: '#ccf3ff',  // Light neon blue tint
          200: '#99e7ff',  // Lighter neon blue
          300: '#66dbff',  // Light neon blue
          400: '#33d0ff',  // Medium neon blue
          500: '#00d4ff',  // Primary neon blue
          600: '#00a6cc',  // Darker neon blue
          700: '#007999',  // Much darker neon blue
          800: '#004d66',  // Very dark neon blue
          900: '#002033',  // Darkest neon blue
        },
        // Secondary orange colors
        accent: {
          50: '#fff4f1',   // Very light orange tint
          100: '#ffe9e1',  // Light orange tint
          200: '#ffd3c3',  // Lighter orange
          300: '#ffbda5',  // Light orange
          400: '#ffa786',  // Medium orange
          500: '#ff6b35',  // Primary orange
          600: '#e55a2b',  // Darker orange
          700: '#cc4921',  // Much darker orange
          800: '#b23817',  // Very dark orange
          900: '#99270d',  // Darkest orange
        },
        // Alert/danger colors (keeping coral for emergency contexts)
        coral: {
          50: '#fff1f0',   // Very light coral
          100: '#ffe3e0',  // Light coral
          200: '#ffc7c1',  // Lighter coral
          300: '#ffaba2',  // Light coral
          400: '#ff8f83',  // Medium coral
          500: '#ff7364',  // Primary coral
          600: '#e55950',  // Darker coral
          700: '#cc3f3c',  // Much darker coral
          800: '#b22528',  // Very dark coral
          900: '#990b14',  // Darkest coral
        },
        // Background gradients
        background: {
          'dark': '#0f0f23',      // gradient-blue-dark
          'mid': '#1a1a3e',       // gradient-blue-mid
          'purple': '#2d1b69',    // gradient-purple-dark
        },
        // Text colors
        text: {
          'light': '#a0a0a0',     // light-gray
          'lighter': '#b0b0b0',   // lighter-gray
          'white': '#ffffff',     // white
        },
        // Social media colors
        social: {
          'twitter': '#1da1f2',
          'facebook': '#4267b2',
          'instagram': '#e4405f',
          'tiktok': '#ff0050',
          'linkedin': '#0077b5',
        },
        // Utility colors with transparency support
        overlay: {
          'white': 'rgba(255, 255, 255, 0.05)',
          'orange': 'rgba(255, 107, 53, 0.1)',
          'black': 'rgba(0, 0, 0, 0.3)',
          'neon': 'rgba(0, 212, 255, 0.3)',
          'neon-strong': 'rgba(0, 212, 255, 0.6)',
        }
      },
      // Custom gradients for the new palette
      backgroundImage: {
        'drewbert-gradient': 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)',
        'neon-gradient': 'linear-gradient(45deg, #00d4ff, #ff6b35)',
      },
      // Box shadows with neon effects
      boxShadow: {
        'neon': '0 0 20px rgba(0, 212, 255, 0.3)',
        'neon-strong': '0 0 30px rgba(0, 212, 255, 0.6)',
        'orange-glow': '0 0 20px rgba(255, 107, 53, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounce 2s infinite',
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-out': 'fadeOut 0.3s ease-out',
        'neon-pulse': 'neonPulse 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        neonPulse: {
          '0%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)' },
          '100%': { boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
};