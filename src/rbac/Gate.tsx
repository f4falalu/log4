/**
 * Gate Component
 *
 * Declarative permission-based show/hide component.
 * Renders children only if the user has the required permission(s).
 *
 * Usage:
 *   <Gate permission="batches.dispatch">
 *     <DispatchButton />
 *   </Gate>
 *
 *   <Gate anyOf={['requisitions.write', 'requisitions.approve']}>
 *     <EditRequisition />
 *   </Gate>
 */

import { ReactNode } from 'react';
import { useAbilityContext } from './AbilityProvider';
import type { Permission } from './types';

interface GateProps {
  /** Single permission required */
  permission?: Permission;
  /** At least one of these permissions required */
  anyOf?: Permission[];
  /** All of these permissions required */
  allOf?: Permission[];
  /** Content to show when permission is denied */
  fallback?: ReactNode;
  children: ReactNode;
}

export function Gate({ permission, anyOf, allOf, fallback = null, children }: GateProps) {
  const { can, canAny, canAll, isLoading } = useAbilityContext();

  // While loading, don't render gated content
  if (isLoading) return null;

  let allowed = false;

  if (permission) {
    allowed = can(permission);
  } else if (anyOf && anyOf.length > 0) {
    allowed = canAny(...anyOf);
  } else if (allOf && allOf.length > 0) {
    allowed = canAll(...allOf);
  } else {
    // No permission specified — allow by default
    allowed = true;
  }

  return <>{allowed ? children : fallback}</>;
}
