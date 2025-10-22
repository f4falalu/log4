import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  safelist: [
    // Borders & text
    'border-biko-border', 'text-operational', 'heading-operational',
    // Status colors
    'text-biko-success', 'text-biko-warning', 'text-biko-danger', 'text-biko-primary', 'text-biko-accent', 'text-biko-muted',
    'bg-biko-success/10', 'bg-biko-warning/10', 'bg-biko-danger/10', 'bg-biko-primary/10', 'bg-biko-accent/10', 'bg-biko-muted/10',
    'border-biko-success/30', 'border-biko-warning/30', 'border-biko-danger/30', 'border-biko-primary/30', 'border-biko-accent/30',
    // Shadows and radius
    'shadow-biko-sm', 'shadow-biko-md', 'shadow-biko-lg', 'shadow-biko-xl',
    'rounded-biko-sm', 'rounded-biko-md', 'rounded-biko-lg',
    // Background gradients
    'bg-gradient-to-r', 'from-biko-primary', 'to-biko-accent',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Shadcn base colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        
        // BIKO Design System Colors
        biko: {
          primary: "var(--biko-primary)",
          accent: "var(--biko-accent)",
          success: "var(--biko-success)",
          warning: "var(--biko-warning)",
          danger: "var(--biko-danger)",
          muted: "var(--biko-muted)",
          dark: "var(--biko-dark)",
          "dark-700": "var(--biko-dark-700)",
          light: "var(--biko-light)",
          border: "var(--biko-border)",
          highlight: "var(--biko-highlight)",
        },
        
        // Workspace-specific colors
        fleetops: {
          bg: "var(--background)",
          "bg-secondary": "var(--background-secondary)",
          fg: "var(--foreground)",
          "fg-muted": "var(--foreground-muted)",
          border: "var(--border)",
          "card-bg": "var(--card-background)",
          "card-border": "var(--card-border)",
          hover: "var(--hover-background)",
          active: "var(--active-background)",
        },
        
        // Legacy support
        medical: {
          DEFAULT: "hsl(var(--medical-blue))",
          light: "hsl(var(--medical-light))",
          accent: "hsl(var(--medical-accent))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      // BIKO Typography
      fontFamily: {
        sans: ["var(--font-family)", "Inter", "sans-serif"],
        operational: ["var(--font-family)", "Inter", "sans-serif"],
      },
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
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'biko-sm': "var(--radius-sm)",
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
            opacity: "0.7",
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
        "slide-in-right": "slide-in-right var(--duration-medium) var(--ease-standard)",
        "pulse-operational": "pulse-operational 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
