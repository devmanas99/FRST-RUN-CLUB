# Security Specification — Rewa FRST Run Club

## 1. Data Invariants
1. **Default-Deny Catch-All**: Unmatched paths are strictly denied (`allow read, write: if false;`).
2. **No PII Storage**: `users/{uid}` stores only `displayName`, `bio`, `photoURL`, `role`, `createdAt`, and `showPublicly`. Phone numbers and emails are forbidden at the schema validation level (`hasOnly`).
3. **Self-Role Escalation Prevention**: When a user creates their own profile (`users/{uid}`), `role` MUST be `'runner'`. When a user updates their own profile, `role` and `createdAt` cannot be modified (`affectedKeys().hasOnly(['displayName', 'bio', 'photoURL', 'showPublicly'])` and `incoming().role == existing().role`).
4. **Admin Authority via Database Role**: Only users whose `/users/$(request.auth.uid)` document has `role == 'admin'` (or the bootstrapped verified owner email) may create, update, or delete documents in `/runs/{id}`, `/events/{id}`, `/rewards/{id}`, and `/settings/{id}`.
5. **Strict Key & Boundary Validation**: Every write validates exact required/allowed keys (`hasAll` and `hasOnly`), string max lengths, numeric bounds, and valid document IDs (`isValidId`).

## 2. The "Dirty Dozen" Payloads

1. **Privilege Escalation on Signup**:
   `POST /users/user123` -> `{ "displayName": "Hacker", "bio": "", "photoURL": "", "role": "admin", "createdAt": "2026-11-09T00:00:00Z", "showPublicly": true }`
2. **Privilege Escalation on Profile Update**:
   `PATCH /users/user123` -> `{ "role": "admin" }`
3. **Cross-User Profile Tampering**:
   `PATCH /users/victim456` (by `user123`) -> `{ "displayName": "Pwned", "bio": "hacked" }`
4. **PII / Shadow Field Injection in User Profile**:
   `POST /users/user123` -> `{ "displayName": "Runner", "bio": "", "photoURL": "", "role": "runner", "createdAt": "2026-11-09T00:00:00Z", "showPublicly": true, "phoneNumber": "+919999999999" }`
5. **Unauthorized Run Creation by Non-Admin**:
   `POST /runs/run999` (by `runnerUser`) -> `{ "uid": "runnerUser", "date": "2026-11-09", "km": 100, "type": "Club run", "addedBy": "runnerUser", "createdAt": "2026-11-09T00:00:00Z" }`
6. **Negative or Extreme Distance Injection**:
   `POST /runs/run999` (by `adminUser`) -> `{ "uid": "runnerUser", "date": "2026-11-09", "km": -50, "type": "Club run", "addedBy": "adminUser", "createdAt": "2026-11-09T00:00:00Z" }`
7. **Invalid Run Type Enum**:
   `POST /runs/run999` (by `adminUser`) -> `{ "uid": "runnerUser", "date": "2026-11-09", "km": 5, "type": "MarathonHack", "addedBy": "adminUser", "createdAt": "2026-11-09T00:00:00Z" }`
8. **Unauthorized Event Creation by Non-Admin**:
   `POST /events/evt999` (by `runnerUser`) -> `{ "title": "Fake Run", "date": "2026-11-15", "time": "06:00 AM", "venue": "Rewa", "distanceKm": 5, "fee": { "male": 0, "female": 0, "couple": 0 }, "perks": ["Free"], "registrationUrl": "https://evil.example" }`
9. **Unauthorized Reward Claim Mutation by Non-Admin**:
   `PATCH /rewards/rew1` (by `runnerUser`) -> `{ "claimed": true }`
10. **Unauthorized Site Settings Hijack by Non-Admin**:
    `PATCH /settings/site` (by `runnerUser`) -> `{ "registrationUrl": "https://phishing.example", "whatsappUrl": "https://phishing.example" }`
11. **Oversized String Denial-of-Wallet Payload**:
    `PATCH /users/user123` -> `{ "bio": "<10,000 char string>" }`
12. **Unverified Email Admin Spoof**:
    `DELETE /runs/run1` by token with `email == 'zil.chandrashekhar@gmail.com'` and `email_verified == false`.
