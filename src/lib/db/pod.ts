// MOD4 Proof of Delivery Database Operations

import { getDB, ProofOfDelivery, DeliveryItem, generatePoDId, PoDStatus } from './schema';

// ============================================
// POD OPERATIONS
// ============================================

export async function createPoD(pod: Omit<ProofOfDelivery, 'id' | 'created_at' | 'sync_status'>): Promise<ProofOfDelivery> {
  const db = await getDB();
  
  const newPoD: ProofOfDelivery = {
    ...pod,
    id: generatePoDId(),
    created_at: Date.now(),
    sync_status: 'pending',
  };
  
  await db.put('proof_of_delivery', newPoD);
  return newPoD;
}

export async function getPoDBySlotId(slotId: string): Promise<ProofOfDelivery | undefined> {
  const db = await getDB();
  const pods = await db.getAllFromIndex('proof_of_delivery', 'by-slot', slotId);
  return pods[0];
}

export async function getPoDById(id: string): Promise<ProofOfDelivery | undefined> {
  const db = await getDB();
  return db.get('proof_of_delivery', id);
}

export interface PoDHistoryOptions {
  limit?: number;
  offset?: number;
  startDate?: number;
  endDate?: number;
  status?: PoDStatus;
  batchId?: string;
}

export async function getPoDHistory(options: PoDHistoryOptions = {}): Promise<ProofOfDelivery[]> {
  const db = await getDB();
  const { limit = 50, offset = 0, startDate, endDate, status, batchId } = options;
  
  let pods: ProofOfDelivery[];
  
  if (batchId) {
    pods = await db.getAllFromIndex('proof_of_delivery', 'by-batch', batchId);
  } else if (status) {
    pods = await db.getAllFromIndex('proof_of_delivery', 'by-status', status);
  } else {
    pods = await db.getAll('proof_of_delivery');
  }
  
  // Filter by date range
  if (startDate || endDate) {
    pods = pods.filter(pod => {
      if (startDate && pod.delivered_at < startDate) return false;
      if (endDate && pod.delivered_at > endDate) return false;
      return true;
    });
  }
  
  // Sort by delivered_at descending (most recent first)
  pods.sort((a, b) => b.delivered_at - a.delivered_at);
  
  // Apply pagination
  return pods.slice(offset, offset + limit);
}

export interface PoDStats {
  total: number;
  completed: number;
  flagged: number;
  discrepancies: number;
  proxyDeliveries: number;
  perfectRate: number;
}

export async function getPoDStats(startDate?: number, endDate?: number): Promise<PoDStats> {
  const db = await getDB();
  let pods = await db.getAll('proof_of_delivery');
  
  // Filter by date range
  if (startDate || endDate) {
    pods = pods.filter(pod => {
      if (startDate && pod.delivered_at < startDate) return false;
      if (endDate && pod.delivered_at > endDate) return false;
      return true;
    });
  }
  
  const total = pods.length;
  const completed = pods.filter(p => p.status === 'completed').length;
  const flagged = pods.filter(p => p.status === 'flagged').length;
  const discrepancies = pods.filter(p => p.has_discrepancy).length;
  const proxyDeliveries = pods.filter(p => p.is_proxy_delivery).length;
  const perfectRate = total > 0 ? ((total - flagged) / total) * 100 : 100;
  
  return {
    total,
    completed,
    flagged,
    discrepancies,
    proxyDeliveries,
    perfectRate,
  };
}

export async function updatePoDSyncStatus(id: string, status: 'synced' | 'error'): Promise<void> {
  const db = await getDB();
  const pod = await db.get('proof_of_delivery', id);
  
  if (pod) {
    pod.sync_status = status;
    if (status === 'synced') {
      pod.synced_at = Date.now();
    }
    await db.put('proof_of_delivery', pod);
  }
}

// ============================================
// DELIVERY ITEMS OPERATIONS
// ============================================

export async function getDeliveryItemsBySlotId(slotId: string): Promise<DeliveryItem[]> {
  const db = await getDB();
  return db.getAllFromIndex('delivery_items', 'by-slot', slotId);
}

export async function saveDeliveryItems(items: DeliveryItem[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('delivery_items', 'readwrite');
  
  for (const item of items) {
    await tx.store.put(item);
  }
  
  await tx.done;
}

// Mock data functions removed - real data comes from IndexedDB synced with Supabase