/** @type {import('tailwindcss').Config} */
export default {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
        extend: {
            colors: {
                // 60% - Background
                cream: {
                    DEFAULT: '#FAF7F2',
                    dark: '#F0EBE3',
                },
                // 30% - Secondary
                terracotta: {
                    DEFAULT: '#C4674A',
                    light: '#D4836A',
                    dark: '#A45538',
                },
                // 10% - Accent
                cobalt: {
                    DEFAULT: '#0047AB',
                    light: '#1A5BC4',
                    dark: '#003580',
                },
                // Text colors
                ink: {
                    DEFAULT: '#2D2A26',
                    muted: '#6B6560',
                },
                // Border/divider
                border: '#E8E0D5',
            },
            fontFamily: {
                heading: ['Sora', 'sans-serif'],
                body: ['Lora', 'serif'],
            },
            maxWidth: {
                content: '720px',
                site: '1200px',
            },
            spacing: {
                18: '4.5rem',
                22: '5.5rem',
            },
            boxShadow: {
                'soft': '0 4px 6px -1px rgba(45, 42, 38, 0.08), 0 2px 4px -1px rgba(45, 42, 38, 0.06)',
            },
            lineHeight: {
                'relaxed-lg': '1.7',
            },
        },
    },
    plugins: [],
}
