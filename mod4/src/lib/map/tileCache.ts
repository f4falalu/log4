// MOD4 Tile Cache
// IndexedDB-based offline tile caching for MapLibre

import { getDB, MapTile } from '@/lib/db/schema';

const TILE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function cacheTile(url: string, blob: Blob): Promise<void> {
  const db = await getDB();
  const tile: MapTile = {
    id: url,
    url,
    blob,
    cached_at: Date.now(),
    expires_at: Date.now() + TILE_EXPIRY,
  };
  await db.put('tiles', tile);
}

export async function getCachedTile(url: string): Promise<Blob | null> {
  const db = await getDB();
  const tile = await db.get('tiles', url);
  
  if (!tile) return null;
  
  // Check if expired
  if (tile.expires_at < Date.now()) {
    await db.delete('tiles', url);
    return null;
  }
  
  return tile.blob;
}

export async function clearExpiredTiles(): Promise<number> {
  const db = await getDB();
  const tx = db.transaction('tiles', 'readwrite');
  const index = tx.store.index('by-expires');
  const expiredTiles = await index.getAll(IDBKeyRange.upperBound(Date.now()));
  
  let count = 0;
  for (const tile of expiredTiles) {
    await tx.store.delete(tile.id);
    count++;
  }
  
  await tx.done;
  return count;
}

export async function getTileCacheSize(): Promise<{ count: number; sizeBytes: number }> {
  const db = await getDB();
  const tiles = await db.getAll('tiles');
  
  let sizeBytes = 0;
  for (const tile of tiles) {
    sizeBytes += tile.blob.size;
  }
  
  return { count: tiles.length, sizeBytes };
}

// Custom protocol handler for offline tiles
export function createOfflineTileProtocol() {
  return async (params: { url: string }, callback: (error?: Error | null, data?: ArrayBuffer | null) => void) => {
    const url = params.url.replace('offline://', 'https://');
    
    try {
      // Try cache first
      const cached = await getCachedTile(url);
      if (cached) {
        const buffer = await cached.arrayBuffer();
        callback(null, buffer);
        return;
      }
      
      // Fetch from network
      const response = await fetch(url);
      if (!response.ok) {
        callback(new Error(`Tile fetch failed: ${response.status}`));
        return;
      }
      
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      
      // Cache for offline use
      await cacheTile(url, blob);
      
      callback(null, buffer);
    } catch (error) {
      // Try cache as fallback
      const cached = await getCachedTile(url);
      if (cached) {
        const buffer = await cached.arrayBuffer();
        callback(null, buffer);
      } else {
        callback(error as Error);
      }
    }
  };
}
