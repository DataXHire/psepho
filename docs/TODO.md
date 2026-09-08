# Production Readiness Master Checklist & Roadmap

This document serves as the authoritative, tracking checklist of all architectural, operational, security, and infrastructure requirements for bringing **Psepho** into production.

Items are organized by priority:
- **`[P0]` Launch Blocker**: Critical prerequisites. Must be completed before serving any production traffic.
- **`[P1]` Production Hardening**: Required for high availability, security audits, resilience, and operational reliability.
- **`[P2]` Scale & Operations**: Post-launch optimizations, scale automation, and Day-2 operations.

---

## Quick Navigation to Detailed Guides
- 📖 [Database Production & Pooling Guide](database-production.md)
- 🚀 [Vercel Deployment Guide](deployment-vercel.md)
- ☁️ [AWS Production Architecture Guide (ECS / RDS / CloudFront)](deployment-aws.md)
- 🔒 [Security, Privacy, and Environment Variable Reference](security-and-env.md)
- 📦 [Deferred Architectural Items](deferred.md)

---

## 1. Database & Data Persistence

| Priority | Status | Area | Task & Requirements | Reference Guide |
| :--- | :--- | :--- | :--- | :--- |
| **P0** | `[ ] Pending` | Connection Pooling | Configure a connection pooler (Neon pooled endpoint, Supabase PgBouncer, or AWS RDS Proxy) in **transaction pooling mode** on port 6543/5432 to prevent connection exhaustion. | [database-production.md §2](database-production.md#2-connection-pooling-architecture) |
| **P0** | `[ ] Pending` | Pool Singleton | Update `apps/web/src/lib/db/index.ts` to attach `pg.Pool` to `globalThis` to prevent connection leaks across Next.js serverless invocations and hot reloads. | [database-production.md §2.3](database-production.md#23-production-pool-configuration-appswebsrclibdbindexts) |
| **P0** | `[ ] Pending` | SSL Enforcement | Enforce `sslmode=require` or configure SSL certificates in production connection strings for all database communication. | [database-production.md §5.2](database-production.md#52-encryption-at-rest--in-transit) |
| **P0** | `[ ] Pending` | Pre-Deploy Migrations | Decouple database migrations from runtime code paths. Automate `pnpm --filter @psepho/web db:migrate` in the CI/CD pipeline against direct unpooled DB connection. | [database-production.md §3](database-production.md#3-database-migration-strategy) |
| **P1** | `[ ] Pending` | PITR Backups | Enable continuous Write-Ahead Logging (WAL) archiving and Point-in-Time Recovery (PITR) with a minimum 30-day retention window. | [database-production.md §6.1](database-production.md#61-point-in-time-recovery-pitr) |
| **P1** | `[ ] Pending` | Multi-AZ Failover | Deploy PostgreSQL with a synchronous standby replica in an alternate Availability Zone (< 60s RTO, RPO = 0). | [database-production.md §6.3](database-production.md#63-high-availability-multi-az) |
| **P1** | `[ ] Pending` | Duplicate Signal Index | Add composite index `ON ballots (poll_id, ip_hash) WHERE ip_hash IS NOT NULL` for sub-second duplicate fingerprint calculations on large polls. | [database-production.md §4](database-production.md#recommended-production-index-additions-p1) |
| **P2** | `[ ] Pending` | Read Replicas | Route intensive analytical queries (e.g. historical ballot exports, heavy IRV tabulations) to a PostgreSQL read replica. | [database-production.md §7](database-production.md#7-performance--sizing-recommendations) |

---

## 2. Cloud Deployment & Hosting

Psepho can be deployed to either **Vercel** (rapid serverless Next.js edge) or **AWS** (containerized ECS Fargate with persistent connections).

### Option A: Vercel Deployment Checklist
*Detailed guide: [deployment-vercel.md](deployment-vercel.md)*

- [ ] **`[P0]` Monorepo Build Command**: Configure Vercel Project Root Directory to `apps/web` or set root build command to `pnpm turbo run build --filter=@psepho/web`.
- [ ] **`[P0]` Region Matching**: Align Vercel Function region (e.g. `iad1`, `bom1`, `fra1`) with the physical region of the PostgreSQL database to avoid cross-region network latency.
- [ ] **`[P0]` SSE Timeout Handling**: Configure `export const maxDuration = 60;` in `/api/polls/[slug]/stream/route.ts` to accommodate Vercel Pro limits, and ensure client falls back to ETag polling when disconnected.
- [ ] **`[P1]` Edge Cache Invalidation**: Verify `Cache-Control: public, max-age=...` headers for static geo assets (`/src/lib/collective/geo/`) and font resources.
- [ ] **`[P1]` Custom Domain & DNS**: Attach apex and `www` domains, provision automatic Let's Encrypt TLS certificates, and enforce HTTP-to-HTTPS redirection.

### Option B: AWS Deployment Checklist
*Detailed guide: [deployment-aws.md](deployment-aws.md)*

- [ ] **`[P0]` Docker Container Optimization**: Set `output: 'standalone'` in `apps/web/next.config.ts` and test multi-stage Docker build producing a minimal runner container (~120MB).
- [ ] **`[P0]` ECR & ECS Fargate Provisioning**: Provision AWS ECR repository, ECS Cluster, and Fargate Task Definition (minimum 2 tasks spread across private subnets).
- [ ] **`[P0]` Application Load Balancer (ALB)**: Provision internet-facing ALB with HTTPS listener (ACM SSL certificate), health check configured to `/api/auth/me` (interval: 30s, threshold: 2).
- [ ] **`[P0]` Secrets Manager Integration**: Store DB credentials, `SERVER_PEPPER`, and Google OAuth secrets in `psepho/production/web` and inject into task definition via IAM.
- [ ] **`[P1]` CloudFront CDN & AWS WAF**: Put CloudFront in front of ALB. Attach AWS WAF with rate-based rules (300 requests / 5 min on `/api/polls/*/ballot`) and AWS Core Rule Set (CRS).
- [ ] **`[P1]` ECS Autoscaling**: Configure target tracking scaling policies on ECS Service (Scale on CPU > 70% or Memory > 80%, min 2 tasks, max 10 tasks).
- [ ] **`[P2]` AWS App Runner Evaluation**: (Alternative to ECS) Evaluate AWS App Runner for automated container deployments if lower infrastructure overhead is desired.

---

## 3. Security, Privacy & Invariants

| Priority | Status | Item | Description | Reference Guide |
| :--- | :--- | :--- | :--- | :--- |
| **`[P0]`** | `[ ] Pending` | Cryptographic Google JWT Verification | Replace `parseJwt()` with cryptographic signature verification using Google's public JWKS (`https://www.googleapis.com/oauth2/v3/certs`) via `jose` or `google-auth-library`. | [security-and-env.md §3](security-and-env.md#3-google-oauth-20-cryptographic-token-verification-p0) |
| **`[P0]`** | `[ ] Pending` | Production `SERVER_PEPPER` | Generate a 256-bit CSPRNG secret (`openssl rand -hex 32`). Enforce an explicit runtime check aborting startup if default dev pepper is detected in production. | [security-and-env.md §2](security-and-env.md#2-cryptographic-security--server_pepper) |
| **`[P0]`** | `[ ] Pending` | Zero Raw IP Verification | Execute `apps/web/scripts/verify-leak-check.sh` and perform automated audit ensuring raw IP addresses never appear in server logs, error traces, or database rows. | [security-and-env.md §2.1](security-and-env.md#21-the-zero-raw-ip-invariant) |
| **`[P0]`** | `[ ] Pending` | Cookie Security Attributes | Ensure all cookies (`psepho_ballot_[slug]`, `psepho_user_id`) enforce `HttpOnly`, `Secure` (in production), and `SameSite=Lax`. | [security-and-env.md §4.1](security-and-env.md#41-ballot-token-anonymization) |
| **`[P1]`** | `[ ] Pending` | Rate Limiting & Bot Protection | Implement IP-based rate limiting on `/api/polls` (creation) and `/api/polls/[slug]/ballot` (voting) via Upstash Redis middleware or Cloudflare/AWS WAF. | [security-and-env.md §5](security-and-env.md#5-rate-limiting--abuse-mitigation) |
| **`[P1]`** | `[ ] Pending` | Security Headers & CSP | Configure strict headers in `next.config.ts`: HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, and Content-Security-Policy supporting Google Sign-In. | [security-and-env.md §6](security-and-env.md#6-http-security-headers) |
| **`[P1]`** | `[ ] Pending` | Design Invariant Enforcement | Audit all voter-facing copy ensuring no over-claiming ("One vote per browser" used; never "one person" or "unique voter"). | `AGENTS.md` |

---

## 4. Environment Variables & Configuration

- [ ] **`[P0]` Production `.env` Audit**: Validate that all environment variables listed in `.env.example` are defined in the target cloud secrets manager:
  - `DATABASE_URL` (pooled connection string)
  - `SERVER_PEPPER` (unique 64-character hex string)
  - `NEXT_PUBLIC_APP_URL` (canonical URL e.g. `https://psepho.org`)
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (verified Google OAuth client ID)
  - `GOOGLE_CLIENT_SECRET` (matching Google OAuth client secret)
  - `NODE_ENV=production`
- [ ] **`[P0]` Dead-Code Elimination Verification**: Verify `pnpm build` output to confirm that development persona switchers (`PersonaModal`, mock profiles) are completely tree-shaken and absent from client JavaScript bundles.
- [ ] **`[P1]` Runtime Config Validation**: Add a startup validation schema (e.g. via Zod in `src/lib/config/environment.ts`) that verifies all required environment variables exist with valid formats upon server initialization.

---

## 5. Realtime, SSE & Polling Optimization

- [ ] **`[P0]` Serverless Disconnect Resilience**: Validate that the client UI automatically reconnects with backoff if the `/api/polls/[slug]/stream` SSE connection terminates.
- [ ] **`[P1]` HTTP ETag Polling Fallback**: For environments where SSE connections are constrained (such as serverless edge), ensure `/api/polls/[slug]/tally` returns `ETag` and `304 Not Modified` on unchanged tallies to prevent redundant JSON rendering.
- [ ] **`[P1]` Database Query Optimization**: In `/api/polls/[slug]/stream/route.ts`, batch option queries and use timestamp comparison (`updated_at > latestUpdated`) to avoid re-aggregating tallies when count hasn't changed.

---

## 6. CI/CD & Automated Quality Gates

- [ ] **`[P0]` GitHub Actions Pipeline**: Implement a `.github/workflows/ci.yml` running:
  - Dependency caching (`pnpm install --frozen-lockfile`)
  - Type checking (`pnpm turbo run build` or `tsc --noEmit`)
  - Full test suite (`turbo run test`)
  - Leak prevention script (`verify-leak-check.sh`)
- [ ] **`[P1]` Non-Interactive ESLint Configuration**: Add `apps/web/.eslintrc.json` (extending `next/core-web-vitals`) so `pnpm --filter @psepho/web lint` runs non-interactively in automated CI/CD runners.
- [ ] **`[P0]` Standalone DB Test Suite**: Ensure integration tests in `apps/web/test/api.test.ts` spin up a test PostgreSQL container (via Docker service container in GitHub Actions) to run DB-backed tests automatically.
- [ ] **`[P1]` Automated Security Scanning**: Run `pnpm audit` and static security scanning (CodeQL or Snyk) in CI to catch vulnerable third-party dependencies before merging.
- [ ] **`[P1]` Production Branch Protection**: Enforce branch protection on `main` requiring passing CI checks and at least one human review before deployment.

---

## 7. Observability, Monitoring & Alerting

- [ ] **`[P1]` Centralized Error Tracking**: Integrate Sentry (`@sentry/nextjs`) to capture unhandled client and server exceptions, stripped of sensitive voter tokens.
- [ ] **`[P1]` Structured Application Logging**: Replace raw `console.log` / `console.error` with a structured JSON logger (e.g. Pino) tagging `pollId` and HTTP status without logging raw IPs.
- [ ] **`[P1]` Health Check Endpoint**: Create a dedicated lightweight health check route `/api/health` checking database connectivity (`SELECT 1`).
- [ ] **`[P1]` CloudWatch / Datadog Alarms**: Configure alarms for:
  - HTTP 5xx rate > 1% over 5 minutes
  - Database CPU utilization > 80%
  - Database connection pool utilization > 90%
  - Latency p95 > 500ms on `/api/polls/[slug]/ballot`
- [ ] **`[P2]` Uptime Monitoring**: Configure external synthetic monitoring (e.g. Better Uptime, Pingdom, or AWS CloudWatch Synthetics) probing `/api/health` every 60 seconds from multiple geographic continents.

---

## 8. Mobile App (React Native / Expo) Production Readiness

- [ ] **`[P1]` EAS Build Configuration**: Configure `apps/mobile/eas.json` for Android App Bundle (`.aab`) and iOS (`.ipa`) production builds.
- [ ] **`[P1]` Production API URL**: Configure `EXPO_PUBLIC_API_URL` pointing to production (`https://psepho.org/api`) rather than `localhost:3000`.
- [ ] **`[P1]` Camera & Haptic Permissions**: Audit `app.json` camera permissions strings (`NSCameraUsageDescription` for iOS, `CAMERA` permission for Android) for QR code scanner compliance in App Store / Google Play guidelines.
- [ ] **`[P2]` Deep Linking Verification**: Test universal links (`https://psepho.org/p/[slug]`) and custom schemes (`psepho://`) across iOS and Android test devices.

---

## 9. Launch Day Execution Protocol

- [ ] **Step 1: Secrets Verification**: Run pre-flight check confirming production secrets are live and `SERVER_PEPPER` is 256-bit CSPRNG.
- [ ] **Step 2: Database Migration Execution**: Run `pnpm --filter @psepho/web db:migrate` against production PostgreSQL.
- [ ] **Step 3: Synthetic Voting Test**: Create a private test poll in production, cast a ballot, verify receipt lookup, test manage link, and confirm tallies increment accurately.
- [ ] **Step 4: Leak Check Script**: Execute synthetic leak test against production endpoint:
  ```bash
  APP_URL=https://psepho.org ./apps/web/scripts/verify-leak-check.sh
  ```
- [ ] **Step 5: DNS Switch & TTL Warmup**: Lower DNS TTL to 300s 24 hours prior to launch, then switch DNS to CloudFront or Vercel.
