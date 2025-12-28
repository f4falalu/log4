import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Updated to support all 5 workspaces (3 are coming soon)
type WorkspaceType = 'fleetops' | 'storefront' | 'admin' | 'dashboard' | 'mod4';

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: (workspace: WorkspaceType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<WorkspaceType>(() => {
    const saved = localStorage.getItem('biko_workspace') as WorkspaceType;
    // Default to fleetops if saved workspace is not available yet
    if (saved && ['fleetops', 'storefront'].includes(saved)) {
      return saved;
    }
    return 'fleetops';
  });

  const setWorkspace = (workspace: WorkspaceType) => {
    setWorkspaceState(workspace);
    localStorage.setItem('biko_workspace', workspace);
  };

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
