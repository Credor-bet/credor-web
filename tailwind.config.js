/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Figma Design Tokens
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          dark: 'hsl(var(--primary-dark))'
        },
        success: 'hsl(var(--success))',
        destructive: 'hsl(var(--destructive))',
        danger: 'hsl(var(--danger))',
        warning: 'hsl(var(--warning))',
        background: {
          DEFAULT: 'hsl(var(--background))',
          light: 'hsl(var(--background-light))',
          gray: 'hsl(var(--background-gray))'
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--foreground-muted))',
          placeholder: 'hsl(var(--foreground-placeholder))'
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          gray: 'hsl(var(--border-gray))'
        },
        accent: {
          yellow: 'hsl(var(--accent-yellow))',
          blue: 'hsl(var(--accent-blue))'
        },
        // shadcn/ui colors (kept for compatibility)
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Rushon Ground', 'DM Sans', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '14.322px' }],
        sm: ['12px', { lineHeight: '15.624px' }],
        base: ['14px', { lineHeight: '18.228px' }],
        md: ['15px', { lineHeight: '18.75px' }],
        lg: ['16px', { lineHeight: '20px' }],
        xl: ['20px', { lineHeight: '26.04px' }],
        '2xl': ['30px', { lineHeight: '39px' }],
        display: ['224px', { lineHeight: '257.688px' }],
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        '4xl': 'var(--radius-4xl)',
        full: 'var(--radius-full)',
        logo: 'var(--radius-logo)',
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '30px',
        '3xl': '36px',
      },
    },
  },
  plugins: [],
}
