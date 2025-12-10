import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { VehicleWithRelations } from '@/types/vlms';

interface AIMetadataSectionProps {
  vehicle: VehicleWithRelations;
}

export function AIMetadataSection({ vehicle }: AIMetadataSectionProps) {
  if (!vehicle.ai_generated) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI-Assisted Measurements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Dimensions were extracted from the onboarding photo using AI technology.
          </AlertDescription>
        </Alert>

        {vehicle.ai_capacity_image_url && (
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-2">Reference Image</div>
            <img
              src={vehicle.ai_capacity_image_url}
              alt="AI capacity reference"
              className="rounded-lg border max-w-sm w-full object-cover"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
