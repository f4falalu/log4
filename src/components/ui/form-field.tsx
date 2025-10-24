import { Label } from "@/components/ui/label"
import { Input, InputProps } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface FormFieldProps extends InputProps {
  label: string
  labelClassName?: string
  containerClassName?: string
}

export function FormField({
  label,
  id,
  className,
  labelClassName,
  containerClassName,
  ...props
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      <Label 
        htmlFor={id}
        className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", labelClassName)}
      >
        {label}
      </Label>
      <Input
        id={id}
        className={cn("w-full transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}
        {...props}
      />
    </div>
  )
}
