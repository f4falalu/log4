import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { TileProvider } from '@/lib/mapConfig';

/**
 * useThemeAwareBasemap Hook
 *
 * Automatically synchronizes basemap style with theme (light/dark mode).
 * Ensures visual consistency between UI and map tiles.
 *
 * Industry Standard:
 * - Light theme → Light basemap (cartoLight)
 * - Dark theme → Dark basemap (cartoDark)
 * - System preference respected on initial load
 * - User preference persists across sessions
 *
 * Usage:
 * ```tsx
 * const [tileProvider, setTileProvider] = useThemeAwareBasemap('fleetops');
 * ```
 *
 * @param workspace - Workspace context for fallback selection
 * @returns [tileProvider, setTileProvider] - Current provider and setter
 */
export function useThemeAwareBasemap(workspace?: string): [TileProvider, (provider: TileProvider) => void] {
  const { theme, systemTheme } = useTheme();

  /**
   * Get default tile provider based on effective theme
   */
  const getDefaultProvider = (): TileProvider => {
    // Resolve effective theme (system → actual system preference)
    const effectiveTheme = theme === 'system' ? systemTheme : theme;

    // Map theme to basemap
    if (effectiveTheme === 'dark') return 'cartoDark';
    if (effectiveTheme === 'light') return 'cartoLight';

    // Fallback to workspace preference
    return workspace === 'fleetops' ? 'cartoDark' : 'cartoLight';
  };

  const [tileProvider, setTileProvider] = useState<TileProvider>(getDefaultProvider());

  /**
   * Sync basemap with theme changes
   */
  useEffect(() => {
    const newProvider = getDefaultProvider();
    setTileProvider(newProvider);
  }, [theme, systemTheme]);

  return [tileProvider, setTileProvider];
}
