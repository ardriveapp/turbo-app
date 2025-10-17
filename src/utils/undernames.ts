/**
 * Utility functions for ArNS undername validation and sanitization
 */

/**
 * Sanitizes an undername to be valid for ArNS
 * Rules:
 * 1. Convert to lowercase
 * 2. Replace spaces with underscores
 * 3. Remove any characters that aren't alphanumeric, hyphen, or underscore
 * 4. Remove leading/trailing dashes and underscores
 */
export function sanitizeUndername(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^[-_]+|[-_]+$/g, '');
}

/**
 * Checks if an undername is valid (after sanitization would be non-empty and different)
 */
export function isValidUndername(value: string): boolean {
  if (!value || !value.trim()) {
    return false;
  }

  const sanitized = sanitizeUndername(value);

  // Valid if sanitized version is non-empty
  return sanitized.length > 0;
}

/**
 * Gets validation message for an undername
 */
export function getUndernameValidationMessage(value: string): string | null {
  if (!value || !value.trim()) {
    return 'Undername cannot be empty';
  }

  const sanitized = sanitizeUndername(value);

  if (sanitized.length === 0) {
    return 'Undername contains only invalid characters';
  }

  if (sanitized !== value) {
    return `Will be sanitized to: ${sanitized}`;
  }

  return null; // Valid
}

/**
 * Checks if an undername has invalid characters that will be removed
 */
export function hasInvalidCharacters(value: string): boolean {
  const sanitized = sanitizeUndername(value);
  return sanitized !== value;
}
