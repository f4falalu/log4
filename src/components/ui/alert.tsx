import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-biko-md border p-4 text-operational [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background border-biko-border text-foreground shadow-biko-sm",
        destructive: "border-biko-danger/50 bg-biko-danger/10 text-biko-danger [&>svg]:text-biko-danger",
        success: "border-biko-success/50 bg-biko-success/10 text-biko-success [&>svg]:text-biko-success",
        warning: "border-biko-warning/50 bg-biko-warning/10 text-biko-warning [&>svg]:text-biko-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("heading-operational mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-operational text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
