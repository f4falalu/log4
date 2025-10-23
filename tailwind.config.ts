import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
        // Existing Shadcn tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        
        // BIKO Design System Tokens
        'biko-primary': 'hsl(var(--biko-primary))',
        'biko-primary-600': 'hsl(var(--biko-primary-600))',
        'biko-primary-700': 'hsl(var(--biko-primary-700))',
        'biko-secondary': 'hsl(var(--biko-secondary))',
        'biko-accent': 'hsl(var(--biko-accent))',
        'biko-success': 'hsl(var(--biko-success))',
        'biko-warning': 'hsl(var(--biko-warning))',
        'biko-danger': 'hsl(var(--biko-danger))',
        'biko-muted': 'hsl(var(--biko-muted))',
        'biko-bg-dark': 'hsl(var(--biko-bg-dark))',
        'biko-surface-1': 'hsl(var(--biko-surface-1))',
        'biko-surface-2': 'hsl(var(--biko-surface-2))',
        'biko-zone-blue': 'hsl(var(--biko-zone-blue))',
        'biko-zone-green': 'hsl(var(--biko-zone-green))',
        'biko-zone-red': 'hsl(var(--biko-zone-red))',
        'biko-zone-amber': 'hsl(var(--biko-zone-amber))',
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
        medical: {
          DEFAULT: "hsl(var(--medical-blue))",
          light: "hsl(var(--medical-light))",
          accent: "hsl(var(--medical-accent))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
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
      },
      backgroundImage: {
        'gradient-medical': 'var(--gradient-medical)',
        'gradient-light': 'var(--gradient-light)',
      },
      boxShadow: {
        'medical': 'var(--shadow-medical)',
        'card': 'var(--shadow-card)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'biko-sm': 'var(--biko-radius-sm)',
        'biko-md': 'var(--biko-radius-md)',
        'biko-lg': 'var(--biko-radius-lg)',
        'biko-xl': 'var(--biko-radius-xl)',
      },
      boxShadow: {
        'biko-sm': 'var(--biko-shadow-sm)',
        'biko-md': 'var(--biko-shadow-md)',
        'biko-lg': 'var(--biko-shadow-lg)',
        'biko-glow-primary': 'var(--biko-shadow-glow-primary)',
        'biko-glow-success': 'var(--biko-shadow-glow-success)',
        'biko-glow-warning': 'var(--biko-shadow-glow-warning)',
        'biko-glow-danger': 'var(--biko-shadow-glow-danger)',
      },
      fontFamily: {
        biko: ['var(--biko-font-family)'],
        'biko-mono': ['var(--biko-font-mono)'],
      },
      transitionTimingFunction: {
        'biko': 'var(--biko-ease)',
        'biko-in': 'var(--biko-ease-in)',
        'biko-out': 'var(--biko-ease-out)',
        'biko-in-out': 'var(--biko-ease-in-out)',
      },
      transitionDuration: {
        'biko-fast': 'var(--biko-duration-fast)',
        'biko-normal': 'var(--biko-duration-normal)',
        'biko-slow': 'var(--biko-duration-slow)',
        'biko-slower': 'var(--biko-duration-slower)',
      },
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
