import { randomBytes } from 'crypto';
/**
 * Generates a secure 5-digit numeric OTP (One-Time Password).
 * This function is designed to work in both browser and Node.js environments.
 *
 * @returns {string} A 5-digit numeric OTP.
 */
export const createOTP = (): string => {
  // Generate a secure 5-digit numeric OTP
  const array = new Uint8Array(5);
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    // Browser environment
    crypto.getRandomValues(array);
  } else {
    // Node.js environment (NestJS)
    const bytes = randomBytes(5);
    array.set(bytes);
  }
  return Array.from(array, (n) => (n % 10).toString()).join('');
};

export const generateToken = (): string => {
  return randomBytes(32).toString('hex');
};
