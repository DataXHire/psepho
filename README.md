# Psepho (ψῆφος)

> **A modern, privacy-first civic consensus platform inspired by the Athenian voting pebble.**

Psepho is an open-source civic polling and collective intelligence system. It enables community groups, organizations, and public forums to create verifiable polls, tabulate ranked-choice votes via Instant-Runoff Voting (IRV), explore demographic and geographic consensus via interactive heatmaps, and verify ballot inclusion without sacrificing voter privacy.

---

## Key Principles & Invariants

1. **Zero Raw IP Storage**: Raw client IP addresses are never written to disk or logs. Client fingerprints are salted with a secret server pepper and hashed per poll: $\text{SHA256}(\text{ip} \mathbin{\Vert} \text{poll\_id} \mathbin{\Vert} \text{SERVER\_PEPPER})$.
2. **Cryptographic Verification**: Every voter receives a 6-character Crockford Base32 cryptographic receipt (e.g. `7K2M9Q`) enabling independent verification of ballot inclusion via `/r/[code]`.
3. **Literal Integrity Claims**: The system never claims more certainty than it possesses. Labels are exact (e.g., *"One vote per browser"*; never *"per person"* or *"unique voter"*).
4. **Athenian Aesthetic & Calm Tone**: Boldness is spent in exactly one place—the physical moment a vote is cast. Everything else is quiet, respectful, and clear. No loud drop shadows, no marketing gradients, no rounded card clutter.
5. **Pebble Tally Rendering**: Ballots and tallies are represented by small, irregular pebble outlines (max 120 SVG nodes rendered simultaneously).

---

## Monorepo Architecture

Psepho is structured as a Turborepo monorepo managed with `pnpm`:

```
psepho/
├── apps/
│   ├── web/               # Next.js 15 App Router web application & REST/SSE API
│   └── mobile/            # React Native (Expo 52) mobile application with QR voting
├── packages/
│   ├── core/              # Domain logic: IRV tabulation, base32 encoding, pebble math, schemas
│   ├── tokens/            # Kinetic Pulse design tokens, Tailwind preset, typography, colors
│   └── api-client/        # Universal isomorphic typed API client
├── tools/
│   └── geo-build/         # Offline cartographic pipeline (Census 2011 & Natural Earth SVG maps)
└── docs/                  # Production readiness roadmap, deployment guides & architecture
    ├── TODO.md            # Master Production Readiness Checklist (P0 / P1 / P2)
    ├── deployment-vercel.md
    ├── deployment-aws.md
    ├── database-production.md
    ├── security-and-env.md
    └── deferred.md
```

---

## Prerequisites

- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher (configured for `pnpm@11.13.1` via Corepack)
- **PostgreSQL**: `15.0` or higher (local or managed like Neon/Supabase/RDS)

---

## Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/psepho.git
cd psepho
pnpm install
```

### 2. Environment Configuration
Copy the template to `.env.local` for the web app:
```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` with your PostgreSQL database URL and development secrets.

### 3. Initialize & Seed Database
```bash
# Run database schema migrations
pnpm --filter @psepho/web db:migrate

# (Optional) Seed sample civic polls, users, and receipt data
pnpm --filter @psepho/web db:seed
```

### 4. Start Development Server
```bash
# Starts both web and mobile apps concurrently via Turbo
pnpm dev
```

- Web application: [http://localhost:3000](http://localhost:3000)
- Mobile Expo developer tools: interactive CLI terminal

---

## Available Scripts

From the repository root, you can run:

| Command | Action |
| :--- | :--- |
| `pnpm dev` | Starts local development servers across all apps (`web` and `mobile`). |
| `pnpm build` | Executes production builds across all workspace packages and apps. |
| `pnpm test` | Runs the test suites across packages (`@psepho/core`, `@psepho/tokens`, `@psepho/web`). |
| `pnpm lint` | Runs TypeScript type checking and ESLint across all projects. |
| `pnpm --filter @psepho/web db:migrate` | Runs idempotent PostgreSQL database schema migrations. |
| `pnpm --filter @psepho/web db:seed` | Seeds database with demo polls, candidate options, and receipts. |
| `pnpm --filter @psepho/web db:generate` | Generates Drizzle Kit SQL schema migration snapshots. |

---

## Configuration & Environment Variables

All runtime settings and secrets are configured through environment variables:

| Variable | Required | Default / Format | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | **Yes** | `postgresql://postgres:postgres@localhost:5432/psepho` | PostgreSQL connection string (pooled in production). |
| `DATABASE_URL_UNPOOLED`| Optional | `postgresql://...:5432/psepho` | Direct unpooled connection for DDL migrations in CI/CD. |
| `SERVER_PEPPER` | **Yes** | 64-character hex string | Cryptographic secret for hashing client IP & User-Agent fingerprints. |
| `NEXT_PUBLIC_APP_URL` | **Yes** | `http://localhost:3000` | Canonical origin for generating QR codes & verification links. |
| `PORT` | Optional | `3000` | Local HTTP port for the web server. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| **Yes** | `*.apps.googleusercontent.com` | Google Identity Services OAuth Client ID for sign-in. |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Secret string | Google OAuth secret for backend token verification. |
| `NODE_ENV` | Optional | `development` / `production` | Strips sample personas from client bundles in production. |

### Application Config (`appConfig.ts`)
Product behavior and choice limits are centralized in `apps/web/src/lib/config/appConfig.ts`:
- **Categories**: `Work & Tech`, `Economy & Future`, `Society & Governance`, `Culture & Life`.
- **Options per Poll**: Minimum 2, Maximum 6.
- **Poll Durations**: 24 hours, 3 days, 7 days, 30 days, or "Always open".
- **Background Styling**: Dynamic interactive pebble field (`pebble`) or minimalist flat surface (`none`).

---

## Production Readiness & Deployment

For production deployments, refer to our comprehensive documentation guides:

- **Master Readiness Checklist**: [docs/TODO.md](docs/TODO.md) (Organized by `[P0]` Blocker, `[P1]` Hardening, `[P2]` Scale)
- **Vercel Deployment Guide**: [docs/deployment-vercel.md](docs/deployment-vercel.md) (Serverless, pooling, SSE limits)
- **AWS Deployment Guide**: [docs/deployment-aws.md](docs/deployment-aws.md) (ECS Fargate, RDS Multi-AZ, CloudFront, WAF)
- **Database Operations**: [docs/database-production.md](docs/database-production.md) (PgBouncer, migrations, indexing, PITR)
- **Security & Privacy Reference**: [docs/security-and-env.md](docs/security-and-env.md) (Google JWT verification, pepper entropy, zero-IP proof)
- **Deferred Architecture**: [docs/deferred.md](docs/deferred.md) (Items deliberately postponed to respect v1 scope)

---

## Verification & Testing

Verify that all systems are operational before committing or deploying:

```bash
# 1. Run unit tests across packages (IRV, Base32, Pebble math, Contrast audits)
pnpm test

# 2. Verify production build and Dead-Code Elimination
pnpm build

# 3. Test after-close tally secrecy (requires running local server & database)
./apps/web/scripts/verify-leak-check.sh
```

---

## Governance & Contributing

- **Standing Constraints**: See `AGENTS.md` for strict design and copy rules.
- **Scope Discipline**: New dependencies, services, or layers not in the spec must be recorded in `docs/deferred.md`.
- **License**: MIT
