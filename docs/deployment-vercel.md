# Deploying Psepho to Vercel

This guide provides a comprehensive, step-by-step procedure for deploying the Psepho web application (`@psepho/web`) to **Vercel**, including monorepo configuration, PostgreSQL connection pooling, serverless architectural nuances, and custom domains.

---

## 1. Overview & Architecture

Vercel provides native hosting for **Next.js 15 App Router** applications. In this architecture:
- Static assets and pre-rendered pages are distributed across the **Vercel Edge Network**.
- Dynamic API routes (`/api/polls`, `/api/polls/[slug]/ballot`, `/api/auth/*`) run as **Vercel Serverless Functions**.
- PostgreSQL must be hosted externally (e.g., **Neon**, **Supabase**, or **AWS RDS**) with a connection pooler enabled.

```
┌─────────────────┐
│     Client      │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Vercel Edge   │ ── Static assets, CSS, Pebble fonts, Favicon
└────────┬────────┘
         │ Serverless Invocations
         ▼
┌─────────────────────────────────┐
│   Vercel Serverless Functions   │ Next.js 15 App Router
└────────────────┬────────────────┘
                 │ Transaction Mode (Port 6543)
                 ▼
┌─────────────────────────────────┐
│   Postgres Connection Pooler    │ (Neon / Supabase PgBouncer / RDS Proxy)
└────────────────┬────────────────┘
                 │ Port 5432
                 ▼
┌─────────────────────────────────┐
│       PostgreSQL Database       │
└─────────────────────────────────┘
```

---

## 2. Prerequisites

1. A **Vercel Account** (Pro plan recommended for team collaboration, longer serverless execution limits, and custom concurrency).
2. A **GitHub Repository** with the Psepho monorepo pushed to `main`.
3. A **Managed PostgreSQL Instance** with connection pooling enabled (Neon, Supabase, or AWS RDS).
4. Google OAuth 2.0 Client Credentials configured in the **Google Cloud Console**.

---

## 3. Step-by-Step Vercel Setup

### Step 1: Import Project into Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
2. Select your repository `psepho`.
3. Under **Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` (or leave at `./` with `turbo` monorepo configuration).
   - **Build Command**: `cd ../.. && pnpm turbo run build --filter=@psepho/web` (or default if root is set to `apps/web`).
   - **Output Directory**: `.next`
   - **Install Command**: `pnpm install`

### Step 2: Configure Serverless Region
To minimize database query latency, ensure your Vercel Serverless Functions are located in the **same region** as your PostgreSQL database:
1. Navigate to **Settings** -> **Functions**.
2. Change **Function Region** to match your database location:
   - For AWS `us-east-1` (N. Virginia): Select `iad1` (Washington, D.C.).
   - For AWS `ap-south-1` (Mumbai): Select `bom1` (Mumbai).
   - For EU `eu-central-1` (Frankfurt): Select `fra1` (Frankfurt).

### Step 3: Configure Environment Variables
In Vercel **Settings** -> **Environment Variables**, add the following:

| Variable Name | Environment | Example / Value | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Production, Preview | `postgresql://user:pass@ep-cool-pooler.us-east-1.aws.neon.tech/psepho?sslmode=require` | Pooled connection string (transaction mode) |
| `DATABASE_URL_UNPOOLED` | Production, Preview | `postgresql://user:pass@ep-cool.us-east-1.aws.neon.tech/psepho?sslmode=require` | Direct connection for schema migrations |
| `SERVER_PEPPER` | Production | `64-hex-char-secure-random-string` | High-entropy server secret for hashing IP/UA |
| `NEXT_PUBLIC_APP_URL` | Production | `https://psepho.org` | Canonical public URL for QR codes & links |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Production, Preview | `123456789.apps.googleusercontent.com` | Google Identity Services client ID |
| `GOOGLE_CLIENT_SECRET` | Production | `GOCSPX-secret` | Google OAuth client secret |
| `NODE_ENV` | Production | `production` | Ensures dead-code branches remove sample personas |

> [!CAUTION]
> **Production Pepper Invariant**: Never use the development fallback string (`psepho-development-secret-pepper-do-not-use-in-production`). Generate a cryptographically secure 256-bit pepper using `openssl rand -hex 32`.

---

## 4. Serverless Execution & Realtime SSE Considerations

### 4.1 The Serverless SSE Constraint
Psepho includes a real-time Server-Sent Events (SSE) route at `/api/polls/[slug]/stream`.
In standard Node.js server environments, SSE connections remain open indefinitely. However, on Vercel:
- **Hobby Plan**: Maximum Serverless Function duration is **10 to 15 seconds**.
- **Pro Plan**: Default duration is **15 seconds** (configurable up to **300 seconds**).
- After the timeout expires, Vercel forcibly terminates the HTTP response stream.

### 4.2 Handling Realtime on Vercel
To ensure seamless operation on Vercel:
1. **Configure Max Duration in Route Handler**:
   In `apps/web/src/app/api/polls/[slug]/stream/route.ts`:
   ```typescript
   export const maxDuration = 60; // Max duration for Vercel Pro (seconds)
   export const dynamic = 'force-dynamic';
   ```
2. **Client-Side Reconnection & HTTP Polling Fallback**:
   The frontend client automatically reconnects when the SSE stream disconnects. For high-volume polling, the client falls back to `GET /api/polls/[slug]/tally` with `If-None-Match` headers:
   - When tallies haven't changed, the server returns `304 Not Modified` with zero body payload.
   - This consumes negligible serverless compute time and database I/O.

---

## 5. Automated Database Migrations in Vercel

Do not trigger migrations from within runtime API routes. Use one of two recommended workflows:

### Workflow A: Vercel Pre-Deploy Hook (Recommended)
Add a pre-deploy migration script to `apps/web/package.json`:
```json
{
  "scripts": {
    "vercel-build": "tsx src/lib/db/migrate.ts && next build"
  }
}
```
*Ensure `DATABASE_URL` in Vercel points to a connection that supports DDL (or pass `DATABASE_URL_UNPOOLED`).*

### Workflow B: GitHub Actions Migration Pipeline
Run migrations in a GitHub Actions workflow prior to triggering or approving the production deployment:
```yaml
- name: Run Database Migrations
  run: pnpm --filter @psepho/web db:migrate
  env:
    DATABASE_URL: ${{ secrets.PROD_DATABASE_URL_DIRECT }}
```

---

## 6. Custom Domain & DNS Configuration

1. In the Vercel Dashboard, go to **Settings** -> **Domains**.
2. Add your custom domain (e.g. `psepho.org` and `www.psepho.org`).
3. Add the corresponding DNS records at your DNS registrar:
   - **Apex domain (`psepho.org`)**: `A` record pointing to `76.76.21.21`.
   - **Subdomain (`www.psepho.org`)**: `CNAME` record pointing to `cname.vercel-dns.com`.
4. Vercel automatically provisions and renews a Let's Encrypt TLS/SSL certificate.

---

## 7. Security Headers & Edge Configuration

Verify that security headers are applied in `apps/web/next.config.ts`:
```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};
```

---

## 8. Rollback & Monitoring

- **Instant Rollback**: If an issue arises post-deployment, navigate to **Deployments** in Vercel, select the previous working deployment, and click **"Rollback to this Deployment"**.
- **Vercel Analytics & Speed Insights**: Enable Vercel Analytics in the project settings for real-time Web Vitals tracking.
