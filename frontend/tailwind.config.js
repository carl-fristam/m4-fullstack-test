export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#6366f1', // Indigo-500 - vibrant blue for dark theme
                'primary-dark': '#4f46e5', // Indigo-600 - darker variant
                'primary-light': '#818cf8', // Indigo-400 - lighter variant
                background: '#0f172a', // Slate-900 - dark navy background
                surface: '#1e293b', // Slate-800 - elevated dark surface
                'surface-light': '#334155', // Slate-700 - lighter surface variant
                border: '#475569', // Slate-600 - borders on dark
                'border-light': '#64748b', // Slate-500 - subtle borders
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
            boxShadow: {
                'subtle': '0 2px 4px rgba(0, 0, 0, 0.3)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
                'glow': '0 0 20px rgba(99, 102, 241, 0.3)',
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
