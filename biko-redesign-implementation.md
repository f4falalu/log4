# BIKO Dashboard Complete UI/UX Redesign Implementation

## 🎯 Objective
Transform the BIKO Fleet & Warehouse Operations dashboard from its current state into a modern, sophisticated interface with fluid design, proper spacing, and elegant data visualization inspired by contemporary CRM dashboards.

---

## 📋 Phase 1: Environment Setup & Cleanup

### Step 1.1: Install Required Dependencies
```bash
# Core UI dependencies
npm install --save \
  @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-tabs \
  @radix-ui/react-tooltip \
  @radix-ui/react-popover \
  @radix-ui/react-separator \
  @radix-ui/react-switch \
  @radix-ui/react-select \
  class-variance-authority \
  clsx \
  tailwind-merge \
  lucide-react \
  recharts \
  date-fns

# Development dependencies
npm install --save-dev \
  @types/node \
  tailwindcss-animate
```

### Step 1.2: Clean Up Existing Styles
```javascript
// Action: Delete or comment out all existing theme files
// Files to modify:
// - /src/styles/theme.css
// - /src/styles/globals.css

/* Remove all instances of:
- Color-coded section blocks (green/purple/orange)
- Harsh borders
- Inline style attributes
- Hardcoded Tailwind color classes
*/
```

### Step 1.3: Configure Tailwind
```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

---

## 📋 Phase 2: Global Styles & Design System

### Step 2.1: Create New Global Styles
```css
/* /src/styles/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .animate-in {
    animation-duration: 0.3s;
    animation-fill-mode: both;
  }
  
  .fade-in {
    animation-name: fade-in;
  }
  
  .slide-in {
    animation-name: slide-in;
  }
}
```

### Step 2.2: Create Utility Functions
```typescript
// /src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}
```

---

## 📋 Phase 3: Base UI Components

### Step 3.1: Card Component
```typescript
// /src/components/ui/card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

### Step 3.2: Button Component
```typescript
// /src/components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### Step 3.3: Badge Component
```typescript
// /src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        warning:
          "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

---

## 📋 Phase 4: Custom Dashboard Components

### Step 4.1: Metric Card Component
```typescript
// /src/components/dashboard/metric-card.tsx
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend = "neutral",
  trendValue,
  className,
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-green-600"
      case "down":
        return "text-red-600"
      default:
        return "text-gray-500"
    }
  }

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
              {trendValue && (
                <div className={cn("flex items-center gap-1", getTrendColor())}>
                  {getTrendIcon()}
                  <span className="text-sm font-medium">{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="rounded-lg bg-muted p-3">
              {React.cloneElement(icon as React.ReactElement, {
                className: "h-5 w-5 text-muted-foreground",
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

### Step 4.2: Data Table Component
```typescript
// /src/components/dashboard/data-table.tsx
import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"

interface DataTableProps<T> {
  columns: {
    key: string
    label: string
    width?: string
    render?: (value: any, row: T) => React.ReactNode
  }[]
  data: T[]
  emptyMessage?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={column.width ? `w-[${column.width}]` : ""}
              >
                {column.label}
              </TableHead>
            ))}
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {columns.map((column) => (
                <TableCell key={column.key}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </TableCell>
              ))}
              <TableCell>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Step 4.3: Empty State Component
```typescript
// /src/components/dashboard/empty-state.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          {React.cloneElement(icon as React.ReactElement, {
            className: "h-6 w-6 text-muted-foreground",
          })}
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
```

---

## 📋 Phase 5: Main Dashboard Implementation

### Step 5.1: Command Center Dashboard
```typescript
// /src/pages/dashboard/command-center.tsx
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetricCard } from "@/components/dashboard/metric-card"
import { DataTable } from "@/components/dashboard/data-table"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  Truck,
  Activity,
  Clock,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Package,
  Calendar,
  BarChart3,
} from "lucide-react"
import { formatNumber, formatPercentage } from "@/lib/utils"

export function CommandCenter() {
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Mock data - replace with actual data
  const metrics = {
    activeRoutes: 0,
    fleetUtilization: 0,
    onTimePerformance: 100,
    todayCompletion: 0,
  }

  const deliveries = []

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate refresh
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRefreshing(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <p className="text-sm text-muted-foreground">
              Real-time operations dashboard • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Active Routes"
            value={metrics.activeRoutes}
            subtitle="0 assigned"
            icon={<Truck />}
            trend="neutral"
          />
          <MetricCard
            title="Fleet Utilization"
            value={formatPercentage(metrics.fleetUtilization)}
            subtitle="0/4 vehicles"
            icon={<Activity />}
            trend="down"
            trendValue="-100%"
          />
          <MetricCard
            title="On-Time Performance"
            value={formatPercentage(metrics.onTimePerformance)}
            subtitle="0 completed"
            icon={<Clock />}
            trend="up"
            trendValue="+100%"
          />
          <MetricCard
            title="Today's Completion"
            value={formatPercentage(metrics.todayCompletion)}
            subtitle="0/0 routes"
            icon={<CheckCircle2 />}
            trend="neutral"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 px-6 pb-6 lg:grid-cols-2">
        {/* Active Deliveries */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Deliveries</CardTitle>
              <Badge variant="secondary">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All (0)</TabsTrigger>
                <TabsTrigger value="assigned">Assigned (0)</TabsTrigger>
                <TabsTrigger value="progress">In Progress (0)</TabsTrigger>
                <TabsTrigger value="completed">Completed (0)</TabsTrigger>
                <TabsTrigger value="delayed">Delayed (0)</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <EmptyState
                  icon={<Package />}
                  title="No active deliveries"
                  description="Deliveries will appear here once operations begin"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Map View */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Live Fleet Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[400px] rounded-lg border bg-gray-100">
              <div className="absolute left-4 top-4 z-10 rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Coverage Area</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Real-time tracking</p>
              </div>
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Map view will load here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="px-6 pb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<Calendar />}
              title="No recent activity"
              description="Activity will appear here once operations begin"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

### Step 5.2: Storefront Dashboard
```typescript
// /src/pages/dashboard/storefront.tsx
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetricCard } from "@/components/dashboard/metric-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import {
  Package2,
  Truck,
  Building2,
  ClipboardList,
  Plus,
  FileText,
  BarChart3,
} from "lucide-react"

export function Storefront() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold tracking-tight">
            Warehouse & Inventory Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage warehouses, facilities, and delivery requisitions
          </p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 rounded-lg bg-blue-100 p-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold">Facilities</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Manage delivery destinations
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 rounded-lg bg-green-100 p-3">
                <ClipboardList className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold">Requisitions</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Create delivery requisitions
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 rounded-lg bg-purple-100 p-3">
                <Truck className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold">Payload Planning</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Plan vehicle loads
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <div className="mb-3 rounded-lg bg-orange-100 p-3">
                <Package2 className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold">Batch Management</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Organize into batches
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Activity & Quick Stats */}
      <div className="grid gap-6 px-6 pb-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<FileText />}
              title="No recent activity"
              description="Activity will appear here once operations begin"
              action={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Requisition
                </Button>
              }
            />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Active Facilities
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Pending Requisitions
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Batches Today
                </span>
                <span className="text-2xl font-bold">0</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

---

## 📋 Phase 6: Integration & Testing

### Step 6.1: Update App Router
```typescript
// /src/App.tsx or main routing file
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CommandCenter } from '@/pages/dashboard/command-center'
import { Storefront } from '@/pages/dashboard/storefront'
import { Navigation } from '@/components/layout/navigation'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/command-center" element={<CommandCenter />} />
          <Route path="/storefront" element={<Storefront />} />
          {/* Add other routes */}
        </Routes>
      </div>
    </Router>
  )
}

export default App
```

### Step 6.2: Navigation Component
```typescript
// /src/components/layout/navigation.tsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MapPin,
  Truck,
  Building2,
  Users,
  FileText,
  Settings,
  LogOut,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: MapPin, label: 'Command Center', path: '/command-center' },
  { icon: MapPin, label: 'Tactical Map', path: '/tactical-map' },
  { icon: Building2, label: 'Facilities', path: '/facilities' },
  { icon: Truck, label: 'Dispatch', path: '/dispatch' },
  { icon: Users, label: 'Drivers', path: '/drivers' },
  { icon: FileText, label: 'Reports', path: '/reports' },
]

export function Navigation() {
  return (
    <nav className="border-b bg-white">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-xl font-bold">BIKO</span>
            <span className="text-sm text-muted-foreground">
              Fleet & Warehouse Operations
            </span>
          </div>
          
          <div className="ml-10 flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-gray-100">
            <Settings className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
            <span className="text-sm font-medium">AD</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
```

---

## 📋 Phase 7: Final Polish & Optimization

### Step 7.1: Add Loading States
```typescript
// /src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
```

### Step 7.2: Add Animations
```css
/* Add to globals.css */
@keyframes slide-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out forwards;
}

/* Stagger animations for lists */
.animate-stagger > * {
  animation: slide-up 0.3s ease-out forwards;
  opacity: 0;
}

.animate-stagger > *:nth-child(1) { animation-delay: 0.05s; }
.animate-stagger > *:nth-child(2) { animation-delay: 0.1s; }
.animate-stagger > *:nth-child(3) { animation-delay: 0.15s; }
.animate-stagger > *:nth-child(4) { animation-delay: 0.2s; }
```

### Step 7.3: Responsive Design Utilities
```typescript
// /src/hooks/useMediaQuery.ts
import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }
    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}
```

---

## 📋 Phase 8: Cleanup & Verification

### Final Checklist

```markdown
## Pre-Implementation Cleanup
- [ ] Backup current codebase
- [ ] Remove all inline styles
- [ ] Delete color-coded section blocks
- [ ] Remove hardcoded Tailwind colors
- [ ] Clean up unused CSS files

## Component Implementation
- [ ] Install all dependencies
- [ ] Set up Tailwind config
- [ ] Create global styles
- [ ] Implement UI components
- [ ] Build dashboard components
- [ ] Create main dashboards
- [ ] Set up navigation

## Visual Verification
- [ ] Clean white cards with subtle shadows
- [ ] Consistent spacing (24px padding)
- [ ] Proper typography scale
- [ ] Smooth hover transitions
- [ ] No color blocks or harsh borders
- [ ] Mobile responsive layouts

## Testing
- [ ] Test all interactive elements
- [ ] Verify hover states
- [ ] Check responsive breakpoints
- [ ] Test loading states
- [ ] Verify animations
- [ ] Cross-browser testing
```

---

## 🚀 Deployment Instructions

```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Build for production
npm run build

# 3. Test production build
npm run preview

# 4. Deploy
npm run deploy
```

---

## 🎯 Expected Result

After implementing all phases, your BIKO dashboard should have:

1. **Modern, clean aesthetic** - White cards with subtle shadows
2. **Consistent spacing** - Professional layout with breathing room
3. **Sophisticated color palette** - Grays with accent blue
4. **Smooth interactions** - Hover states and transitions
5. **Professional typography** - Inter font with proper scale
6. **Responsive design** - Works on all screen sizes
7. **Intuitive navigation** - Clear visual hierarchy
8. **Elegant data visualization** - Clean charts and metrics

The transformation will take your dashboard from a basic, color-blocked interface to a modern, professional SaaS application that looks and feels premium.

---

## ⚠️ Common Pitfalls to Avoid

1. **Don't skip the cleanup phase** - Old styles will conflict
2. **Don't mix component libraries** - Stick to the design system
3. **Don't use inline styles** - Keep everything in components
4. **Don't forget hover states** - They make the UI feel alive
5. **Don't ignore spacing** - Consistency is key
6. **Don't rush animations** - Keep them subtle and smooth

---

## 📝 Notes for Claude Code

When implementing this redesign:
- Start with Phase 1 and work sequentially
- Test each component before moving on
- Use the exact class names provided
- Don't deviate from the color palette
- Keep all animations under 300ms
- Always use the `cn()` utility for merging classes
- Maintain TypeScript types throughout

