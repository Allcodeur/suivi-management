/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#060B17',
        surf: '#0C1525',
        surf2: '#111E35',
        surf3: '#162648',
        border: '#1B2E54',
        primary: '#6366F1',
        success: '#10B981',
        warn: '#F59E0B',
        danger: '#EF4444',
        info: '#38BDF8',
        violet: '#A78BFA',
        muted: '#64748B',
        dim: '#334155',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
