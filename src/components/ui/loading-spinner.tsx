import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  className,
  size = "md",
  text,
  fullScreen = false,
  ...props
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  const spinner = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className
      )}
      {...props}
    >
      <Loader2
        className={cn(
          "animate-spin text-primary",
          sizeMap[size]
        )}
      />
      {text && (
        <span className="text-sm text-muted-foreground">
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Usage examples:
// <LoadingSpinner />
// <LoadingSpinner size="lg" text="Loading data..." />
// <LoadingSpinner fullScreen text="Loading application..." />
