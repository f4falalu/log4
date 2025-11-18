/**
 * VLMS Vehicle Onboarding Page
 * Route: /fleetops/vlms/vehicles/onboard
 */

import { VehicleOnboardWizard } from '@/components/vlms/vehicle-onboarding/VehicleOnboardWizard';

export default function VehicleOnboardPage() {
  return (
    <div className="container py-8">
      <VehicleOnboardWizard />
    </div>
  );
}
