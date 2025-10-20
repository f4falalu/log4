import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type WorkspaceType = 'fleetops' | 'storefront';

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: (workspace: WorkspaceType) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<WorkspaceType>(() => {
    return (localStorage.getItem('biko_workspace') as WorkspaceType) || 'fleetops';
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
