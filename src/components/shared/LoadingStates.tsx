import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";

// Skeleton Components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 bg-secondary" />
          <Skeleton className="h-8 w-24 bg-secondary" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-0">
          {/* Header Row */}
          <div className="flex border-b border-border bg-secondary/30 p-4">
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex-1 px-2">
                <Skeleton className="h-4 w-20 bg-secondary" />
              </div>
            ))}
          </div>
          {/* Data Rows */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="flex border-b border-border/30 p-4 hover:bg-secondary/20">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={colIndex} className="flex-1 px-2">
                  <Skeleton className={`h-3 bg-secondary/70 ${
                    colIndex === 0 ? 'w-32' : colIndex === 1 ? 'w-24' : 'w-16'
                  }`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20 bg-secondary" />
                <Skeleton className="h-8 w-16 bg-secondary" />
              </div>
              <Skeleton className="h-10 w-10 rounded-md bg-secondary" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading Spinners
export function LoadingSpinner({ 
  size = "md", 
  className 
}: { 
  size?: "sm" | "md" | "lg"; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin text-primary", 
        sizeClasses[size], 
        className
      )} 
    />
  );
}

export function LoadingOverlay({ 
  message = "Loading...", 
  className 
}: { 
  message?: string; 
  className?: string; 
}) {
  return (
    <div className={cn(
      "absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg",
      className
    )}>
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
}

// Empty States
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(
      "flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
      className
    )}>
      {Icon && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
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
  );
}

// Progress Indicators
export function ProgressBar({ 
  value, 
  max = 100, 
  label,
  variant = "default",
  className 
}: {
  value: number;
  max?: number;
  label?: string;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const variantClasses = {
    default: "from-biko-primary to-biko-accent",
    success: "from-biko-success to-biko-success/80",
    warning: "from-biko-warning to-biko-warning/80",
    danger: "from-biko-danger to-biko-danger/80",
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <div className="flex justify-between text-operational text-sm">
          <span>{label}</span>
          <span className="text-muted-foreground">{value}/{max}</span>
        </div>
      )}
      <div className="w-full bg-biko-highlight/30 rounded-biko-sm h-2 overflow-hidden">
        <div
          className={cn(
            "h-full bg-gradient-to-r transition-all duration-slow shadow-biko-sm",
            variantClasses[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Pulse Animation for Live Data
export function PulseIndicator({ 
  active = true, 
  color = "success",
  size = "sm",
  className 
}: {
  active?: boolean;
  color?: "success" | "warning" | "danger" | "primary";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const colorClasses = {
    success: "bg-biko-success",
    warning: "bg-biko-warning", 
    danger: "bg-biko-danger",
    primary: "bg-biko-primary",
  };

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "rounded-full",
        colorClasses[color],
        sizeClasses[size],
        active && "animate-pulse"
      )} />
      {active && (
        <div className={cn(
          "absolute inset-0 rounded-full animate-ping opacity-75",
          colorClasses[color],
          sizeClasses[size]
        )} />
      )}
    </div>
  );
}
