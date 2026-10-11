// Client-side checks mirror the server's zod rules so most mistakes are caught before a request.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return undefined;
}

export function validateNewPassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (new TextEncoder().encode(password).length > 72) return 'Password must be at most 72 bytes';
  return undefined;
}

export const hasErrors = (errors) => Object.values(errors).some(Boolean);
