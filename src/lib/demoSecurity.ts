export const PROTECTED_DEMO_EMAILS = [
  'admin@helpdesk.com',
  'kumbharganesh815@gmail.com',
  'kumbharganesh929@gmail.com',
  'abhishek@helpdesk.com',
  'bhairav@helpdesk.com',
  'agent@helpdesk.com',
];

/**
 * Checks if a given email is a core protected demo account.
 * Protected accounts cannot have their passwords, emails, or active roles modified by public reviewers.
 */
export function isProtectedDemoEmail(email?: string | null): boolean {
  if (!email) return false;
  const target = email.trim().toLowerCase();
  return PROTECTED_DEMO_EMAILS.some((protectedEmail) => protectedEmail.toLowerCase() === target);
}
