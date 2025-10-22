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
