/**
 * AbilityProvider
 *
 * React context that provides RBAC ability state to the component tree.
 * Wraps useAbility and makes it accessible via useAbilityContext().
 */

import { createContext, useContext, ReactNode } from 'react';
import { useAbility } from './useAbility';
import type { AbilityState } from './types';

const AbilityContext = createContext<AbilityState | undefined>(undefined);

interface AbilityProviderProps {
  workspaceId: string | null;
  children: ReactNode;
}

export function AbilityProvider({ workspaceId, children }: AbilityProviderProps) {
  const ability = useAbility({ workspaceId });

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
}

export function useAbilityContext(): AbilityState {
  const context = useContext(AbilityContext);
  if (!context) {
    throw new Error('useAbilityContext must be used within an AbilityProvider');
  }
  return context;
}
