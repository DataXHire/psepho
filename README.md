# Psepho (ψῆφος)

> **A modern, privacy-first civic consensus platform inspired by the Athenian voting pebble.**

Psepho enables organizations and public forums to create verifiable polls, tabulate ranked-choice votes via Instant-Runoff Voting (IRV), explore demographic consensus, and verify ballot inclusion without sacrificing voter privacy.

---

## Core Invariants

* **Zero Raw IP Storage**: Raw client IP addresses are never saved. Fingerprints use salted hashes: `SHA256(ip : poll_id : SERVER_PEPPER)`.
* **Cryptographic Receipts**: Every voter receives a 6-character Crockford Base32 receipt code (e.g. `7K2M9Q`) for independent verification at `/r/[code]`.
* **Literal Integrity**: Labels state literal certainty (e.g. *"One vote per browser"*; never *"unique voter"* or *"per person"*).
* **Calm Aesthetic**: Boldness is spent exclusively when a vote is cast. Pebbles represent cast ballots (inline SVG, max 120 nodes).

---

## Repository Structure

```
psepho/
├── apps/
│   ├── web/               # Next.js 15 App Router web application & API
│   └── mobile/            # React Native (Expo 52) mobile app
├── packages/
│   ├── core/              # IRV tabulation, Crockford Base32, pebble math
│   ├── tokens/            # Design tokens, Tailwind preset, typography, colors
│   ├── api-client/        # Universal typed API client
│   └── infra/             # AWS CDK v2 deployment package (Amplify + RDS)
├── tools/geo-build/       # SVG boundary generator for geographic heatmaps
└── docs/                  # Architecture specs & production guides
```

---

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example apps/web/.env.local
# Set DATABASE_URL and SERVER_PEPPER in apps/web/.env.local
```

### 3. Initialize Database (PostgreSQL 15+)
```bash
pnpm --filter @psepho/web db:migrate
pnpm --filter @psepho/web db:seed
```

### 4. Running the Development Servers

You can run servers concurrently or individually:

```bash
# Run both Web & Mobile concurrently:
pnpm dev

# Run Web application only (http://localhost:3000):
pnpm dev:web
# or: pnpm --filter @psepho/web dev

# Run Mobile application only (Expo dev tools):
pnpm dev:mobile
# or: pnpm --filter @psepho/mobile dev
```

---

## Common Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Run all applications concurrently via Turbo |
| `pnpm dev:web` | Run Next.js web application only (`:3000`) |
| `pnpm dev:mobile` | Run Expo React Native application only |
| `pnpm build` | Build all packages and apps for production |
| `pnpm test` | Run test suites across the monorepo |
| `pnpm lint` | Run TypeScript & lint checks across projects |
| `pnpm --filter @psepho/web db:migrate` | Execute Drizzle database migrations |
| `pnpm --filter @psepho/web db:seed` | Seed database with demo civic polls |

---

## Deployment

### Automated Deployment (AWS CDK)
Psepho includes an Infrastructure as Code package using AWS CDK to provision AWS Amplify Hosting (Next.js 15 SSR) and optional Amazon RDS PostgreSQL:

```bash
# Deploy dev environment (Amplify + RDS)
pnpm cdk:deploy:dev

# Deploy with external serverless Postgres (Neon / Supabase)
pnpm cdk:synth -c deployRds=false -c databaseUrl="postgresql://..."
```
*See [`packages/infra/README.md`](packages/infra/README.md) for full commands, prerequisites, and setup instructions.*

### Manual Deployment

#### 1. AWS Amplify Hosting (Console)
1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify).
2. Select **Deploy an app** and connect your GitHub repository.
3. In app settings, set **Monorepo root directory** to `apps/web`.
4. Amplify will automatically pick up the root [`amplify.yml`](amplify.yml) build specification.
5. In **Environment variables**, set `DATABASE_URL`, `SERVER_PEPPER`, and `NEXT_PUBLIC_APP_URL`.
6. Save and deploy.

#### 2. Vercel
1. Run `pnpm dlx vercel` from the repo root, or import the repo in the Vercel Dashboard.
2. Set **Root Directory** to `apps/web`.
3. Configure `DATABASE_URL` (using a pooled connection string, e.g. Neon or Supabase) and `SERVER_PEPPER`.
4. *See [docs/deployment-vercel.md](docs/deployment-vercel.md) for details.*

#### 3. Docker / Self-Hosted VPS
1. Enable `output: 'standalone'` in `apps/web/next.config.ts`.
2. Build container: `docker build -t psepho-web .`
3. Run container: `docker run -d -p 3000:3000 --env-file .env.production psepho-web`
4. *See [docs/deployment-aws.md](docs/deployment-aws.md) for enterprise ECS Fargate architecture.*

---

## Documentation

* **Infrastructure & CDK Runbook**: [`packages/infra/README.md`](packages/infra/README.md)
* **Production Checklist**: [`docs/TODO.md`](docs/TODO.md)
* **Database Operations & Indexing**: [`docs/database-production.md`](docs/database-production.md)
* **Security & Environment**: [`docs/security-and-env.md`](docs/security-and-env.md)
* **Design & Invariants**: [`AGENTS.md`](AGENTS.md)

---

## License

MIT
