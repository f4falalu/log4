import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Phone, MessageSquare, Navigation, X } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';

interface DriverDrawerProps {
  isOpen: boolean;
  driverId: string | null;
  onClose: () => void;
}

export function DriverDrawer({ isOpen, driverId, onClose }: DriverDrawerProps) {
  const { data: drivers = [] } = useDrivers();
  const driver = driverId ? drivers.find((d: any) => d.id === driverId) : null;

  if (!driver) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'available':
        return 'default';
      case 'busy':
        return 'secondary';
      case 'offline':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const initials = driver.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader className="border-b border-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <SheetTitle>Driver Details</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Header with Avatar */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{driver.name}</h3>
              <p className="text-sm text-muted-foreground">{driver.phone}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getStatusVariant(driver.status)}>
                  {driver.status}
                </Badge>
                <Badge variant="outline">{driver.licenseType}</Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Total Deliveries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {driver.totalDeliveries || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">On-Time %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {driver.onTimePercentage || 100}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Shift Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Shift Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift Start:</span>
                <span className="font-medium">{driver.shiftStart}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift End:</span>
                <span className="font-medium">{driver.shiftEnd}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Hours:</span>
                <span className="font-medium">{driver.maxHours}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button className="w-full gap-2">
                <Phone className="h-4 w-4" />
                Call Driver
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <MessageSquare className="h-4 w-4" />
                Message
              </Button>
            </div>

            <Button variant="outline" className="w-full gap-2">
              <Navigation className="h-4 w-4" />
              Navigate to Location
            </Button>
          </div>

          {/* Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Performance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall:</span>
                  <span className="font-medium">
                    {driver.performanceScore || 0}/100
                  </span>
                </div>
                <Progress value={driver.performanceScore || 0} />
              </div>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
