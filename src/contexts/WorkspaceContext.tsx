import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type WorkspaceType = 'fleetops' | 'storefront';

interface WorkspaceContextType {
  workspace: WorkspaceType;
  setWorkspace: (workspace: WorkspaceType) => void;
  theme: string;
  isDarkMode: boolean;
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

  // Apply workspace theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-fleetops', 'theme-storefront');
    
    // Apply workspace-specific theme
    if (workspace === 'fleetops') {
      root.classList.add('theme-fleetops');
    } else {
      root.classList.add('theme-storefront');
    }
    
    // Apply BIKO font family
    root.style.fontFamily = 'var(--font-family)';
  }, [workspace]);

  const theme = workspace === 'fleetops' ? 'theme-fleetops' : 'theme-storefront';
  const isDarkMode = workspace === 'fleetops';

  return (
    <WorkspaceContext.Provider value={{ workspace, setWorkspace, theme, isDarkMode }}>
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
