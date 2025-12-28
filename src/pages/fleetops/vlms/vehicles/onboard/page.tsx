/**
 * VLMS Vehicle Onboarding Route - DEPRECATED
 * Route: /fleetops/vlms/vehicles/onboard
 *
 * This route is deprecated. Vehicle configuration is now done via modal dialog.
 * Redirecting to vehicles list page.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VehicleOnboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 3 seconds
    const timer = setTimeout(() => {
      navigate('/fleetops/vlms/vehicles');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-muted/20 p-6">
      <div className="max-w-md w-full space-y-4">
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Route Deprecated</AlertTitle>
          <AlertDescription>
            This route is no longer used. Vehicle configuration is now accessed via modal dialog
            from the vehicles list page.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col gap-2">
          <Button onClick={() => navigate('/fleetops/vlms/vehicles')} className="w-full">
            Go to Vehicles List
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Redirecting automatically in 3 seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
