import { FacilityListRouteForm } from './FacilityListRouteForm';

interface SandboxRouteFormProps {
  onSuccess: () => void;
}

export function SandboxRouteForm({ onSuccess }: SandboxRouteFormProps) {
  return <FacilityListRouteForm onSuccess={onSuccess} isSandbox />;
}
