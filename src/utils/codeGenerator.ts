/**
 * Generate a unique 6-digit partner code
 */
export function generatePartnerCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Validate partner code format
 */
export function validatePartnerCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
