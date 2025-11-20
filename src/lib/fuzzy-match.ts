/**
 * Fuzzy matching utilities for CSV import data normalization
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of names
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1, higher is more similar)
 */
export function similarityScore(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
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
export function fuzzyMatch<T>(
  value: string | null | undefined,
  options: T[],
  threshold: number = 0.7,
  accessor: (option: T) => string = (opt) => String(opt)
): { match: T; score: number; isExact: boolean } | null {
  if (!value || !options.length) return null;

  const normalized = value.trim().toLowerCase();
  let bestMatch: T | null = null;
  let bestScore = 0;
  let isExact = false;

  for (const option of options) {
    const optionStr = accessor(option).trim().toLowerCase();

    // Check for exact match first
    if (optionStr === normalized) {
      return { match: option, score: 1.0, isExact: true };
    }

    // Calculate similarity
    const score = similarityScore(normalized, optionStr);
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
