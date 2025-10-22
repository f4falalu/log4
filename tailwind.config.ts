import type { Config } from "tailwindcss";
import { fontFamily } from 'tailwindcss/defaultTheme';

export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}"
  ],
  safelist: [
    // Status colors
    'text-success', 'bg-success/10', 'border-success/20',
    'text-warning', 'bg-warning/10', 'border-warning/20',
    'text-destructive', 'bg-destructive/10', 'border-destructive/20',
    'text-primary', 'bg-primary/10', 'border-primary/20',
    'text-muted-foreground', 'bg-muted', 'border-border',
    // Typography
    'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm', 'text-xs',
    'font-semibold', 'font-medium', 'font-normal',
    // Spacing
    'p-2', 'p-3', 'p-4', 'p-6', 'py-2', 'px-3', 'space-y-2', 'space-y-4', 'space-y-6',
    // Layout
    'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'md:grid-cols-2', 'lg:grid-cols-4',
    // Interactive states
    'hover:bg-muted/50', 'hover:text-foreground', 'focus-visible:ring-2', 'focus-visible:ring-ring',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        heading: ['var(--font-heading)', ...fontFamily.sans],
      },
      colors: {
        // BIKO Design System Colors
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        // Legacy support
        medical: {
          DEFAULT: "hsl(var(--medical-blue) / <alpha-value>)",
          light: "hsl(var(--medical-light) / <alpha-value>)",
          accent: "hsl(var(--medical-accent) / <alpha-value>)",
        },
      },
      // BIKO Typography
      fontSize: {
        xs: "var(--font-size-xs)",
        sm: "var(--font-size-sm)",
        base: "var(--font-size-md)",
        lg: "var(--font-size-lg)",
        xl: "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
      },
      lineHeight: {
        normal: "var(--line-height-normal)",
        tight: "var(--line-height-tight)",
        relaxed: "var(--line-height-relaxed)",
      },
      
      // BIKO Spacing
      spacing: {
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
      },
      
      // BIKO Background Images
      backgroundImage: {
        'gradient-medical': 'var(--gradient-medical)',
        'gradient-light': 'var(--gradient-light)',
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-fleetops': 'linear-gradient(135deg, var(--biko-dark), var(--biko-dark-700))',
        'gradient-storefront': 'linear-gradient(135deg, #ffffff, var(--biko-light))',
      },
      
      // BIKO Shadows
      boxShadow: {
        'medical': 'var(--shadow-medical)',
        'card': 'var(--shadow-card)',
        'biko-sm': 'var(--shadow-sm)',
        'biko-md': 'var(--shadow-md)',
        'biko-lg': 'var(--shadow-lg)',
        'biko-xl': 'var(--shadow-xl)',
        'operational': '0 4px 12px rgba(0,0,0,0.15)',
      },
      
      // BIKO Border Radius
      borderRadius: {
        none: '0px',
        sm: 'calc(var(--radius) - 4px)',
        DEFAULT: 'calc(var(--radius) - 2px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 2px)',
        xl: 'calc(var(--radius) + 4px)',
        full: '9999px',
        'biko-md': "var(--radius-md)",
        'biko-lg': "var(--radius-lg)",
      },
      
      // BIKO Component Sizes
      height: {
        'btn': 'var(--button-height)',
        'input': 'var(--input-height)',
        'table-row': 'var(--table-row-height)',
        'header': 'var(--header-height)',
      },
      width: {
        'sidebar': 'var(--sidebar-width)',
        'sidebar-collapsed': 'var(--sidebar-collapsed)',
        'drawer': 'var(--drawer-width)',
      },
      maxWidth: {
        'modal': 'var(--modal-max-width)',
      },
      
      // BIKO Transitions
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'medium': 'var(--duration-medium)',
        'slow': 'var(--duration-slow)',
      },
      transitionTimingFunction: {
        'standard': 'var(--ease-standard)',
        'overshoot': 'var(--ease-overshoot)',
        'sharp': 'var(--ease-sharp)',
      },
      // BIKO Keyframes & Animations
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-right": {
          from: {
            transform: "translateX(100%)",
          },
          to: {
            transform: "translateX(0)",
          },
        },
        "pulse-operational": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: ".5",
          },
        },
        "shimmer": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(100%)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in var(--duration-medium) var(--ease-standard)",
        "slide-up": "slide-up 200ms ease-out",
        "slide-in-right": "slide-in-right var(--duration-medium) var(--ease-standard)",
        "pulse-operational": "pulse-operational 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;