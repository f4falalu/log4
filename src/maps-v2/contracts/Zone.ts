/**
 * Zone.ts — Canonical zone domain type
 *
 * A Zone is a named set of H3 cells at resolution 7.
 * Geometry is NEVER stored as polygons — only as H3 index arrays.
 * Zones are mutable but every mutation is audited.
 */

export interface Zone {
  id: string;
  name: string;
  description: string;
  h3Indexes: string[]; // Resolution 7 ONLY
  status: 'draft' | 'active' | 'archived';
  createdAt: string; // ISO 8601
  createdBy: string; // actor ID
  updatedAt: string; // ISO 8601
  updatedBy: string; // actor ID
}

export function createZone(
  params: Pick<Zone, 'name' | 'description' | 'h3Indexes'> & { actorId: string }
): Zone {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: params.name,
    description: params.description,
    h3Indexes: params.h3Indexes,
    status: 'draft',
    createdAt: now,
    createdBy: params.actorId,
    updatedAt: now,
    updatedBy: params.actorId,
  };
}
