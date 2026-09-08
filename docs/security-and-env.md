# Security, Privacy, and Environment Variable Reference

This document provides an exhaustive reference of all environment variables, cryptographic security guarantees, Google OAuth token verification, and abuse mitigation strategies for **Psepho**.

---

## 1. Environment Variable Matrix

The table below lists every environment variable utilized across the monorepo, its scope, and security handling:

| Variable | Scope | Required in Prod? | Secrets Vault? | Default / Example | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Server | **Yes** | **Yes** | `postgresql://user:pass@pooler.db.net:6543/psepho?sslmode=require` | Primary pooled PostgreSQL connection string for Drizzle ORM. |
| `DATABASE_URL_UNPOOLED` | CI / Pre-deploy | Optional | **Yes** | `postgresql://user:pass@direct.db.net:5432/psepho?sslmode=require` | Direct connection for schema migrations (bypasses PgBouncer transaction mode). |
| `DATABASE_SSL` | Server | Optional | No | `'true'` or `'false'` | Forces explicit TLS handling in `pg.Pool` configuration. |
| `SERVER_PEPPER` | Server | **Yes** | **Yes** | `e7b8f9a01c2d3e4f...` (64 hex characters) | Cryptographic secret for hashing client IP and User-Agent fingerprints. |
| `NEXT_PUBLIC_APP_URL` | Client & Server | **Yes** | No | `https://psepho.org` | Canonical domain used for absolute links, OpenGraph tags, and QR codes. |
| `PORT` | Server | Optional | No | `3000` | HTTP listener port for production container or local dev server. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client & Server | **Yes** | No | `123456789.apps.googleusercontent.com` | Google Identity Services OAuth 2.0 Web Client ID. |
| `GOOGLE_CLIENT_SECRET` | Server | Optional (ID token) / Yes (Auth code) | **Yes** | `GOCSPX-abc123secret` | Google OAuth client secret for backend token verification. |
| `NODE_ENV` | Build & Server | **Yes** | No | `production` | Triggers Dead-Code Elimination (DCE) removing test personas from production bundles. |

---

## 2. Cryptographic Security & `SERVER_PEPPER`

### 2.1 The Zero Raw IP Invariant
Psepho strictly forbids storing raw client IP addresses or unhashed browser identifiers.

To prevent sybil attacks while preserving voter privacy:
1. When a ballot is submitted (`POST /api/polls/[slug]/ballot`), the server extracts the client IP (`x-forwarded-for` or `x-real-ip`) and the `user-agent`.
2. The server computes a keyed SHA-256 hash:
   $$\text{ip\_hash} = \text{SHA256}(\text{ip} \mathbin{\Vert} \text{poll\_id} \mathbin{\Vert} \text{SERVER\_PEPPER})$$
   $$\text{ua\_hash} = \text{SHA256}(\text{ua} \mathbin{\Vert} \text{poll\_id} \mathbin{\Vert} \text{SERVER\_PEPPER})$$
3. The raw IP address is discarded immediately in memory and never written to logs or disk.
4. Because the `poll_id` is mixed into the hash, cross-poll tracking is cryptographically impossible even with database access.

### 2.2 Entropy Requirements for `SERVER_PEPPER`
The pepper **must** be generated using a cryptographically secure pseudo-random number generator (CSPRNG):
```bash
# Generate a 256-bit (64 hex character) pepper
openssl rand -hex 32
```

> [!CAUTION]
> **Production Startup Assertion**:
> In production, if `SERVER_PEPPER` is undefined, empty, or equals `psepho-development-secret-pepper-do-not-use-in-production`, the server process should abort immediately on startup to prevent compromised anonymization.

### 2.3 Pepper Rotation Policy
Rotating `SERVER_PEPPER` alters future hashes. To rotate without breaking poll manage duplicate signals on active polls:
1. Schedule rotations during maintenance windows when active polls are finalized.
2. In-flight polls will calculate duplicate signals with the new pepper for subsequent votes.

---

## 3. Google OAuth 2.0 Cryptographic Token Verification (P0)

### 3.1 Current Implementation vs. Production Requirement
In development, `apps/web/src/app/api/auth/google/route.ts` decodes Google credentials via `parseJwt(body.credential)`.

**Production Hardening Requirement**:
In production, you must verify the cryptographic signature of the Google ID Token against Google's published JSON Web Key Set (JWKS). Otherwise, an attacker could forge a token containing arbitrary `sub` or `email` claims.

### 3.2 Production Verification Implementation
Install `jose` (zero-dependency standard Web Crypto library) or `google-auth-library`:
```bash
pnpm --filter @psepho/web add jose
```

Implement token validation:
```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs')
);

export async function verifyGoogleIdToken(token: string) {
  const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });

  return {
    googleId: payload.sub as string,
    email: payload.email as string,
    name: (payload.name || payload.given_name || 'Google User') as string,
    avatar: payload.picture as string | undefined,
  };
}
```

---

## 4. Ballot & Receipt Cryptography

### 4.1 Ballot Token Anonymization
- When a user votes, the browser generates a 128-bit random ballot token (`ballotToken`) stored in an `HttpOnly`, `SameSite=Lax` cookie (`psepho_ballot_[slug]`).
- The database stores only $\text{SHA256}(\text{ballotToken})$ in `ballots.ballot_token_hash`.
- A database compromise does not allow impersonating or revising a voter's ballot without the secret token stored in their browser cookie.

### 4.2 Verifiable Receipts
- Each cast ballot produces a 6-character Crockford Base32 receipt code (e.g. `7K2M9Q`).
- Voters can verify their vote was counted using `/r/[code]` or `/r/verify`.
- The receipt code reveals the question and timestamp, confirming inclusion in the tally without exposing secret identifiers.

---

## 5. Rate Limiting & Abuse Mitigation

To defend against ballot stuffing and DDoS floods, enforce rate limits at the network edge (Cloudflare / AWS WAF) or via application middleware (Upstash Redis / Memory Cache):

| Endpoint | Method | Recommended Limit | Action on Breach |
| :--- | :--- | :--- | :--- |
| `/api/polls` | `POST` | 5 requests / 10 minutes per IP | HTTP 429 Too Many Requests |
| `/api/polls/[slug]/ballot` | `POST` | 10 requests / 1 minute per IP | HTTP 429 Too Many Requests |
| `/api/auth/google` | `POST` | 10 requests / 5 minutes per IP | HTTP 429 Too Many Requests |
| `/api/receipts/[code]` | `GET` | 30 requests / 1 minute per IP | HTTP 429 Too Many Requests |

---

## 6. HTTP Security Headers

Configure HTTP security headers in `apps/web/next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com",
      "connect-src 'self' https://accounts.google.com",
      "frame-src https://accounts.google.com",
    ].join('; '),
  },
];
```
