/**
 * Fuzzy matching utilities for CSV import data normalization
 */

/**
 * Calculate Levenshtein distance between two strings with early termination.
 * If maxDistance is provided, returns early once it's clear the result will exceed it.
 */
export function levenshteinDistance(str1: string, str2: string, maxDistance?: number): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Quick length-based rejection
  if (maxDistance !== undefined && Math.abs(len1 - len2) > maxDistance) {
    return maxDistance + 1;
  }

  // Use two single-row arrays instead of full matrix (O(n) memory vs O(n×m))
  let prev = new Array(len2 + 1);
  let curr = new Array(len2 + 1);

  for (let j = 0; j <= len2; j++) prev[j] = j;

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,       // deletion
        curr[j - 1] + 1,   // insertion
        prev[j - 1] + cost  // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }

    // Early termination: if the best possible score in this row already exceeds max, bail out
    if (maxDistance !== undefined && rowMin > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows
    [prev, curr] = [curr, prev];
  }

  return prev[len2];
}

/**
 * Calculate similarity score between two strings (0-1, higher is more similar).
 * Accepts an optional threshold — if provided, uses early termination when the
 * score can't possibly meet the threshold.
 */
export function similarityScore(str1: string, str2: string, threshold?: number): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  // Convert threshold to max allowable distance for early termination
  const maxDistance = threshold !== undefined
    ? Math.floor(maxLen * (1 - threshold))
    : undefined;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase(), maxDistance);
  return 1 - distance / maxLen;
}

/**
 * Fuzzy match a value against a list of options
 * Returns the best match if similarity is above threshold
 *
 * @param value - The value to match
 * @param options - Array of possible matches
 * @param threshold - Minimum similarity score (0-1), default 0.7
 * @param accessor - Function to extract string from option object
 */
// Pre-built lookup maps for O(1) exact matching, keyed by accessor identity
const exactMatchMaps = new WeakMap<readonly any[], Map<string, any>>();

function getExactMatchMap<T>(options: T[], accessor: (option: T) => string): Map<string, T> {
  // Use the options array reference as cache key
  let map = exactMatchMaps.get(options as readonly any[]) as Map<string, T> | undefined;
  if (!map) {
    map = new Map();
    for (const option of options) {
      map.set(accessor(option).trim().toLowerCase(), option);
    }
    exactMatchMaps.set(options as readonly any[], map);
  }
  return map;
}

export function fuzzyMatch<T>(
  value: string | null | undefined,
  options: T[],
  threshold: number = 0.7,
  accessor: (option: T) => string = (opt) => String(opt)
): { match: T; score: number; isExact: boolean } | null {
  if (!value || !options.length) return null;

  const normalized = value.trim().toLowerCase();

  // O(1) exact match via pre-built map
  const exactMap = getExactMatchMap(options, accessor);
  const exact = exactMap.get(normalized);
  if (exact) {
    return { match: exact, score: 1.0, isExact: true };
  }

  let bestMatch: T | null = null;
  let bestScore = 0;

  for (const option of options) {
    const optionStr = accessor(option).trim().toLowerCase();

    // Calculate similarity with early termination using threshold
    const score = similarityScore(normalized, optionStr, threshold);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = option;
    }
  }

  // Return best match only if above threshold
  if (bestMatch && bestScore >= threshold) {
    return { match: bestMatch, score: bestScore, isExact: false };
  }

  return null;
}

/**
 * Find multiple fuzzy matches and return them sorted by score
 *
 * @param value - The value to match
 * @param options - Array of possible matches
 * @param limit - Maximum number of matches to return
 * @param threshold - Minimum similarity score
 * @param accessor - Function to extract string from option object
 */
export function fuzzyMatchMultiple<T>(
  value: string | null | undefined,
  options: T[],
  limit: number = 5,
  threshold: number = 0.6,
  accessor: (option: T) => string = (opt) => String(opt)
): Array<{ match: T; score: number; isExact: boolean }> {
  if (!value || !options.length) return [];

  const normalized = value.trim().toLowerCase();
  const matches: Array<{ match: T; score: number; isExact: boolean }> = [];

  for (const option of options) {
    const optionStr = accessor(option).trim().toLowerCase();

    // Check for exact match
    if (optionStr === normalized) {
      matches.push({ match: option, score: 1.0, isExact: true });
      continue;
    }

    // Calculate similarity
    const score = similarityScore(normalized, optionStr);
    if (score >= threshold) {
      matches.push({ match: option, score, isExact: false });
    }
  }

  // Sort by score (descending) and limit results
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Check if a value contains a substring (case-insensitive)
 */
export function containsMatch(value: string, searchTerm: string): boolean {
  return value.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * Normalize a name for comparison (lowercase, trim, remove extra spaces)
 */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Normalize multiple spaces to single space
}
