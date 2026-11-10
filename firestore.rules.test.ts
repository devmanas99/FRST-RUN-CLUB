/**
 * Security Rules Verification Suite for Rewa FRST Run Club
 * Verifies all 12 "Dirty Dozen" adversarial payloads are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Privilege Escalation on Signup (role: admin)',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user123',
    payload: {
      displayName: 'Hacker',
      bio: 'Fast runner',
      photoURL: '',
      role: 'admin',
      createdAt: '2026-11-09T00:00:00.000Z',
      showPublicly: true,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Privilege Escalation on Profile Update',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'update',
    path: '/users/user123',
    payload: { role: 'admin' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-User Profile Tampering',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'update',
    path: '/users/victim456',
    payload: { displayName: 'Pwned' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII / Shadow Field Injection in User Profile',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'create',
    path: '/users/user123',
    payload: {
      displayName: 'Runner',
      bio: '',
      photoURL: '',
      role: 'runner',
      createdAt: '2026-11-09T00:00:00.000Z',
      showPublicly: true,
      phoneNumber: '+919999999999',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unauthorized Run Creation by Non-Admin',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'create',
    path: '/runs/run999',
    payload: {
      uid: 'user123',
      date: '2026-11-09',
      km: 100,
      type: 'Club run',
      addedBy: 'user123',
      createdAt: '2026-11-09T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Negative Distance Injection',
    auth: { uid: 'admin1', email: 'zil.chandrashekhar@gmail.com', email_verified: true },
    operation: 'create',
    path: '/runs/run999',
    payload: {
      uid: 'user123',
      date: '2026-11-09',
      km: -50,
      type: 'Club run',
      addedBy: 'admin1',
      createdAt: '2026-11-09T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Invalid Run Type Enum',
    auth: { uid: 'admin1', email: 'zil.chandrashekhar@gmail.com', email_verified: true },
    operation: 'create',
    path: '/runs/run999',
    payload: {
      uid: 'user123',
      date: '2026-11-09',
      km: 5,
      type: 'MarathonHack',
      addedBy: 'admin1',
      createdAt: '2026-11-09T00:00:00.000Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized Event Creation by Non-Admin',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'create',
    path: '/events/evt999',
    payload: {
      title: 'Fake Run',
      date: '2026-11-15',
      time: '06:00 AM',
      venue: 'Rewa',
      distanceKm: 5,
      fee: { male: 0, female: 0, couple: 0 },
      perks: ['Free'],
      registrationUrl: 'https://evil.example',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Unauthorized Reward Claim Mutation by Non-Admin',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'update',
    path: '/rewards/rew1',
    payload: { claimed: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized Site Settings Hijack by Non-Admin',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'update',
    path: '/settings/site',
    payload: {
      registrationUrl: 'https://phishing.example',
      whatsappUrl: 'https://phishing.example',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized Bio String Injection',
    auth: { uid: 'user123', email: 'runner@example.com', email_verified: true },
    operation: 'update',
    path: '/users/user123',
    payload: { bio: 'x'.repeat(1000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unverified Email Admin Spoof',
    auth: { uid: 'spoofAdmin', email: 'zil.chandrashekhar@gmail.com', email_verified: false },
    operation: 'delete',
    path: '/runs/run1',
    expectedResult: 'PERMISSION_DENIED',
  },
];
