# Database Production Readiness & Operations Guide

This guide details the PostgreSQL database architecture, connection pooling, migration lifecycle, performance indexing, and disaster recovery procedures for **Psepho** in production.

---

## 1. Architectural Overview

Psepho uses **PostgreSQL (15+)** managed via **Drizzle ORM** (`@psepho/web/src/lib/db`). The relational schema supports:
- Poll specifications and configuration (`polls`)
- Dynamic voting options (`options`)
- Verifiable, receipt-backed voter ballots (`ballots`)
- Pre-aggregated real-time ballot counters (`tallies`)
- Cached Instant-Runoff Voting (IRV) tabulation snapshots (`poll_results`)
- Authenticated civic user profiles (`users`)

```
               ┌────────────────┐
               │     polls      │
               └───────┬────────┘
                       │ 1:N
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   options    │ │   ballots    │ │ poll_results │
└───────┬──────┘ └──────────────┘ └──────────────┘
        │ 1:N
        ▼
┌──────────────┐
│   tallies    │
└──────────────┘
```

---

## 2. Connection Pooling Architecture

### 2.1 The Serverless Connection Problem
In serverless environments (such as **Vercel Serverless Functions** or **AWS Lambda**), each execution instance creates independent database connections. Under sudden traffic spikes (e.g., a viral poll), hundreds of concurrent lambdas can easily exhaust PostgreSQL's `max_connections` (typically 100–500), causing connection refused errors (`500 ECONNREFUSED`).

### 2.2 Connection Pooler Solutions
A connection pooler operating in **transaction pooling** mode is **mandatory** for production.

| Provider / Environment | Recommended Pooler | Port / Protocol | Configuration Note |
| :--- | :--- | :--- | :--- |
| **AWS (ECS / App Runner)** | AWS RDS Proxy or native PgBouncer | 5432 (RDS Proxy endpoint) | Keep connection reuse high; configure TLS. |
| **AWS (Lambda)** | AWS RDS Proxy | 5432 | Required to prevent connection storms. |
| **Vercel / Edge** | Neon Pooling or Supabase PgBouncer | 6543 (Transaction mode) | Use `?sslmode=require` and pooled connection string. |
| **Self-Hosted / VPS** | PgBouncer container | 6432 | `pool_mode = transaction`, `max_client_conn = 10000`. |

### 2.3 Production Pool Configuration (`apps/web/src/lib/db/index.ts`)
To prevent connection leaks across hot reloads and serverless invocations, wrap the `pg.Pool` instance in a global singleton pattern:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === 'production' ? 20 : 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
};

// Prevent multiple pools during hot-reloads and container recycling
declare global {
  var __psepho_pg_pool__: Pool | undefined;
}

const pool = globalThis.__psepho_pg_pool__ ?? new Pool(poolConfig);
if (process.env.NODE_ENV !== 'production') {
  globalThis.__psepho_pg_pool__ = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
```

---

## 3. Database Migration Strategy

### 3.1 Migration Workflow
Psepho uses Drizzle ORM. We support two migration mechanisms:

1. **Declarative Migration Runner** (`apps/web/src/lib/db/migrate.ts`):
   - Uses idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`).
   - Suitable for bootstrap scripts, integration tests, and container startup hooks.

2. **Drizzle Kit Versioned Migrations** (`drizzle.config.ts`):
   - Generates versioned SQL snapshots into an `apps/web/drizzle/` migrations folder.
   - Recommended for production CI/CD pipelines to guarantee atomic, auditable schema evolution.

### 3.2 Running Migrations in CI/CD

#### Step 1: Generate SQL Snapshots (Local / PR stage)
```bash
pnpm --filter @psepho/web db:generate
```

#### Step 2: Execute Migrations Before Deployment
Never execute migrations inside runtime HTTP request handlers. Execute migrations as a pre-deployment step in your CI/CD pipeline (e.g. GitHub Actions, AWS CodeBuild, or Vercel Build Step):

```bash
# Set production DATABASE_URL (using direct non-pooled connection for DDL)
pnpm --filter @psepho/web db:migrate
```

> [!IMPORTANT]
> **Pooler Note for Migrations**:
> PgBouncer in transaction mode does not support transactional DDL or advisory locks. Always point `DATABASE_URL` during migrations to the **direct PostgreSQL port (5432)**, not the PgBouncer transaction port (6543).

### 3.3 Zero-Downtime Migration Principles
1. **Additive Only**: Add new columns as nullable or with safe defaults.
2. **Dual-Writing**: If renaming or migrating fields, write to both old and new columns across one release cycle before removing the old column.
3. **Index Creation**: Use `CREATE INDEX CONCURRENTLY` in raw SQL scripts for large tables (`ballots`) to prevent locking table writes.

---

## 4. Indexing & Query Optimization Audit

The following table summarizes the existing indexes and production recommendations:

| Table | Index Name | Columns / Condition | Purpose |
| :--- | :--- | :--- | :--- |
| `polls` | `idx_polls_closes_at_open` | `closes_at WHERE closed_at IS NULL` | High-frequency query for open poll discovery and auto-closure checks. |
| `polls` | `polls_slug_key` | `slug UNIQUE` | Fast primary poll lookup by vanity / nano-ID slug. |
| `ballots` | `uq_ballots_poll_token` | `poll_id, ballot_token_hash UNIQUE` | Enforces "one vote per browser device" invariant; prevents double voting. |
| `ballots` | `uq_ballots_poll_receipt` | `poll_id, receipt_code UNIQUE` | Fast O(1) receipt verification lookup (`/r/[code]`). |
| `ballots` | `idx_ballots_poll_cast_at` | `poll_id, cast_at` | Rapid chronological ballot auditing and timeline queries. |
| `tallies` | `tallies_pkey` | `poll_id, option_id` | Atomic counter increments (`UPDATE tallies SET count = count + 1`). |
| `users` | `idx_users_google_id` | `google_id` | Sub-millisecond user lookup during Google Sign-In. |
| `users` | `idx_users_email` | `email` | Profile deduplication and session validation. |

### Recommended Production Index Additions (P1)
For high-volume deployments (exceeding 100,000 ballots):
```sql
-- Fast duplicate fingerprint detection for manage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ballots_poll_ip_hash 
ON ballots (poll_id, ip_hash) 
WHERE ip_hash IS NOT NULL;

-- Fast option lookup ordered by position
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_options_poll_position 
ON options (poll_id, position);
```

---

## 5. Security & Privacy Invariants

### 5.1 Zero Raw IP Storage
Psepho strictly forbids persisting raw IPv4 or IPv6 addresses.
- In `apps/web/src/lib/api-helpers.ts`:
  ```typescript
  export function computeIpHash(ip: string, pollId: string): string {
    return hashWithPepper(ip, pollId);
  }
  ```
- Formula: `SHA256(ip + ":" + pollId + ":" + SERVER_PEPPER)`
- The salt/pepper is isolated per poll and secret across servers. Raw IP addresses never touch persistent storage.

### 5.2 Encryption at Rest & in Transit
- **In Transit**: Enforce TLS 1.3 for all database connections (`sslmode=require`).
- **At Rest**: Enable AWS KMS or cloud-provider transparent disk encryption (AES-256) for all storage volumes and automated snapshot archives.

---

## 6. Backup, High Availability & Disaster Recovery

### 6.1 Point-in-Time Recovery (PITR)
- Enable WAL (Write-Ahead Logging) archiving with continuous streaming to object storage (e.g. AWS S3).
- Retention target: **30 days** of continuous PITR capability.

### 6.2 Automated Snapshot Schedule
- **Daily Full Snapshot**: Executed during low-traffic windows (e.g., 03:00 UTC).
- **Cross-Region Replication**: Replicate daily snapshots to a secondary geographic region (e.g., `us-east-1` to `us-west-2` or `ap-south-1` to `ap-southeast-1`) for geographic disaster protection.

### 6.3 High Availability (Multi-AZ)
- Deploy PostgreSQL with a synchronous standby replica in an alternate Availability Zone.
- Automatic failover threshold: **< 60 seconds** RTO (Recovery Time Objective) with **zero data loss** (RPO = 0).

---

## 7. Performance & Sizing Recommendations

| Scale Tier | Ballots / Day | Suggested Postgres Specs | Connection Pool Size | Storage |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Launch)** | Up to 10,000 | 2 vCPU, 4 GB RAM (AWS db.t4g.medium / Neon Pro) | 20 connections | 20 GB gp3 SSD |
| **Tier 2 (Growth)** | Up to 250,000 | 4 vCPU, 16 GB RAM (AWS db.r6g.large / Aurora Serverless v2) | 50 connections + RDS Proxy | 100 GB gp3 SSD |
| **Tier 3 (High Scale)** | 1,000,000+ | 8 vCPU, 32 GB RAM (Aurora Serverless v2 + Read Replicas) | 100+ via RDS Proxy | Autoscaling storage |
