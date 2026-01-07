export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                // Archival Noir palette
                primary: '#F5A524',
                'primary-dark': '#D4890C',
                'primary-light': '#FFCB66',
                background: '#08090d',
                'background-elevated': '#0d0f14',
                surface: '#12141a',
                'surface-light': '#1a1d26',
                'surface-hover': '#22262f',
                border: '#2a2f3a',
                'border-light': '#3d4451',
                'text-primary': '#F4F4F5',
                'text-secondary': '#A1A1AA',
                'text-muted': '#71717A',
                // Semantic colors
                'accent-sage': '#7CB084',
                'accent-sage-dark': '#4A7553',
                'accent-coral': '#E57373',
                'accent-sky': '#64B5F6',
            },
            fontFamily: {
                display: ['"Instrument Serif"', 'Georgia', 'serif'],
                sans: ['"Geist"', '"SF Pro Display"', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['"Geist Mono"', '"SF Mono"', 'Consolas', 'monospace'],
            },
            fontSize: {
                'display-xl': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
                'display-lg': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
                'display-md': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
            },
            boxShadow: {
                'subtle': '0 1px 2px rgba(0, 0, 0, 0.4)',
                'card': '0 4px 12px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03)',
                'elevated': '0 8px 30px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)',
                'glow-primary': '0 0 40px -8px rgba(245, 165, 36, 0.4)',
                'glow-soft': '0 0 60px -12px rgba(245, 165, 36, 0.2)',
                'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out forwards',
                'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
                'fade-in-down': 'fadeInDown 0.4s ease-out forwards',
                'slide-in-left': 'slideInLeft 0.4s ease-out forwards',
                'slide-in-right': 'slideInRight 0.4s ease-out forwards',
                'scale-in': 'scaleIn 0.3s ease-out forwards',
                'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeInDown: {
                    '0%': { opacity: '0', transform: 'translateY(-8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideInLeft: {
                    '0%': { opacity: '0', transform: 'translateX(-16px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                slideInRight: {
                    '0%': { opacity: '0', transform: 'translateX(16px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                pulseSoft: {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.6' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-subtle': 'linear-gradient(135deg, var(--tw-gradient-stops))',
                'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            },
        },
    },
    plugins: [
        // eslint-disable-next-line
        require('@tailwindcss/typography'),
    ],
}
