/**
 * zoneTags.ts
 *
 * Zone tag semantics.
 *
 * GOVERNANCE:
 * - Tags define MEANING, not color
 * - Tags are reusable across zones
 * - Tags do not contain UI logic
 * - Severity is semantic, not visual
 *
 * This file has NO map dependency.
 */

/**
 * Zone tag definition
 */
export interface ZoneTag {
  /** Unique key for the tag (snake_case) */
  key: string;

  /** Human-readable label */
  label: string;

  /** Semantic severity level */
  severity: 'low' | 'medium' | 'high';

  /** Description of what this tag means */
  description: string;

  /** Category for grouping in UI */
  category: ZoneTagCategory;
}

/**
 * Tag categories
 */
export type ZoneTagCategory =
  | 'access'      // Access restrictions
  | 'risk'        // Risk/safety concerns
  | 'operations'  // Operational constraints
  | 'compliance'  // Regulatory/compliance
  | 'custom';     // User-defined

/**
 * Built-in zone tags
 * These are the canonical tags available in the system
 */
export const ZONE_TAGS: Record<string, ZoneTag> = {
  // Access restrictions
  restricted_access: {
    key: 'restricted_access',
    label: 'Restricted Access',
    severity: 'high',
    description: 'Area requires special authorization to enter',
    category: 'access',
  },
  controlled_entry: {
    key: 'controlled_entry',
    label: 'Controlled Entry',
    severity: 'medium',
    description: 'Area has controlled entry points',
    category: 'access',
  },
  public_access: {
    key: 'public_access',
    label: 'Public Access',
    severity: 'low',
    description: 'Area is publicly accessible',
    category: 'access',
  },

  // Risk/safety
  security_threat: {
    key: 'security_threat',
    label: 'Security Threat',
    severity: 'high',
    description: 'Active security concern in this area',
    category: 'risk',
  },
  high_risk: {
    key: 'high_risk',
    label: 'High Risk',
    severity: 'high',
    description: 'Elevated risk level for operations',
    category: 'risk',
  },
  medium_risk: {
    key: 'medium_risk',
    label: 'Medium Risk',
    severity: 'medium',
    description: 'Moderate risk level for operations',
    category: 'risk',
  },
  low_risk: {
    key: 'low_risk',
    label: 'Low Risk',
    severity: 'low',
    description: 'Normal risk level for operations',
    category: 'risk',
  },
  hazardous: {
    key: 'hazardous',
    label: 'Hazardous',
    severity: 'high',
    description: 'Area contains hazardous conditions',
    category: 'risk',
  },

  // Operations
  hard_to_reach: {
    key: 'hard_to_reach',
    label: 'Hard to Reach',
    severity: 'medium',
    description: 'Area has accessibility challenges',
    category: 'operations',
  },
  no_vehicle_access: {
    key: 'no_vehicle_access',
    label: 'No Vehicle Access',
    severity: 'medium',
    description: 'Vehicles cannot enter this area',
    category: 'operations',
  },
  time_restricted: {
    key: 'time_restricted',
    label: 'Time Restricted',
    severity: 'medium',
    description: 'Access limited to certain times',
    category: 'operations',
  },
  priority_zone: {
    key: 'priority_zone',
    label: 'Priority Zone',
    severity: 'low',
    description: 'High priority service area',
    category: 'operations',
  },
  service_exclusion: {
    key: 'service_exclusion',
    label: 'Service Exclusion',
    severity: 'high',
    description: 'No service should be provided in this area',
    category: 'operations',
  },

  // Compliance
  regulatory_zone: {
    key: 'regulatory_zone',
    label: 'Regulatory Zone',
    severity: 'medium',
    description: 'Area subject to specific regulations',
    category: 'compliance',
  },
  privacy_zone: {
    key: 'privacy_zone',
    label: 'Privacy Zone',
    severity: 'medium',
    description: 'Data privacy restrictions apply',
    category: 'compliance',
  },
  audit_required: {
    key: 'audit_required',
    label: 'Audit Required',
    severity: 'low',
    description: 'Operations require audit logging',
    category: 'compliance',
  },
};

/**
 * Get a tag by key
 */
export function getTag(key: string): ZoneTag | undefined {
  return ZONE_TAGS[key];
}

/**
 * Get all tags
 */
export function getAllTags(): ZoneTag[] {
  return Object.values(ZONE_TAGS);
}

/**
 * Get tags by category
 */
export function getTagsByCategory(category: ZoneTagCategory): ZoneTag[] {
  return Object.values(ZONE_TAGS).filter((tag) => tag.category === category);
}

/**
 * Get tags by severity
 */
export function getTagsBySeverity(severity: 'low' | 'medium' | 'high'): ZoneTag[] {
  return Object.values(ZONE_TAGS).filter((tag) => tag.severity === severity);
}

/**
 * Validate tag keys
 * Returns invalid keys if any
 */
export function validateTagKeys(keys: string[]): {
  valid: boolean;
  invalidKeys: string[];
} {
  const invalidKeys = keys.filter((key) => !ZONE_TAGS[key]);
  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
  };
}

/**
 * Get highest severity from a list of tag keys
 */
export function getHighestSeverity(
  tagKeys: string[]
): 'none' | 'low' | 'medium' | 'high' {
  if (tagKeys.length === 0) return 'none';

  const severityOrder: Record<string, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  let maxSeverity = 0;
  let result: 'low' | 'medium' | 'high' = 'low';

  for (const key of tagKeys) {
    const tag = ZONE_TAGS[key];
    if (tag && severityOrder[tag.severity] > maxSeverity) {
      maxSeverity = severityOrder[tag.severity];
      result = tag.severity;
    }
  }

  return maxSeverity === 0 ? 'none' : result;
}

/**
 * Create a custom tag
 * Custom tags are not persisted in ZONE_TAGS
 */
export function createCustomTag(
  key: string,
  label: string,
  description: string,
  severity: 'low' | 'medium' | 'high' = 'low'
): ZoneTag {
  return {
    key,
    label,
    severity,
    description,
    category: 'custom',
  };
}

/**
 * Tag categories metadata for UI
 */
export const TAG_CATEGORIES: Record<ZoneTagCategory, {
  label: string;
  description: string;
}> = {
  access: {
    label: 'Access Control',
    description: 'Tags related to entry and access restrictions',
  },
  risk: {
    label: 'Risk & Safety',
    description: 'Tags indicating risk or safety concerns',
  },
  operations: {
    label: 'Operations',
    description: 'Tags affecting operational decisions',
  },
  compliance: {
    label: 'Compliance',
    description: 'Tags related to regulatory compliance',
  },
  custom: {
    label: 'Custom',
    description: 'User-defined tags',
  },
};
