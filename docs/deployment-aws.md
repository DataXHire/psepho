# Deploying Psepho to Amazon Web Services (AWS)

This guide provides an enterprise-ready architecture and step-by-step procedure for deploying **Psepho** to **Amazon Web Services (AWS)** using containerized Next.js on **AWS ECS Fargate**, **Amazon RDS for PostgreSQL**, **AWS Secrets Manager**, and **Amazon CloudFront**.

---

## 1. Enterprise Architecture Overview

Containerizing Psepho on AWS ECS Fargate allows long-lived HTTP connections (supporting Server-Sent Events `/api/polls/[slug]/stream` without artificial serverless execution cutoffs), private VPC network isolation, and dedicated database connection pooling.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             AWS Cloud Architecture                          │
│                                                                             │
│   [ Route 53 DNS ]  ──▶  [ CloudFront CDN + AWS WAF + ACM SSL ]             │
│                                      │                                      │
│                                      ▼                                      │
│                [ Application Load Balancer (Public Subnets) ]                │
│                                      │                                      │
│                     ┌────────────────┴────────────────┐                     │
│                     ▼                                 ▼                     │
│     [ ECS Fargate: Next.js Task 1 ]   [ ECS Fargate: Next.js Task 2 ]       │
│     (Private Subnet AZ-1)             (Private Subnet AZ-2)                 │
│                     │                                 │                     │
│                     └────────────────┬────────────────┘                     │
│                                      │                                      │
│                                      ▼                                      │
│                       [ AWS RDS Proxy (Port 5432) ]                         │
│                                      │                                      │
│                                      ▼                                      │
│             [ Amazon RDS PostgreSQL 15+ (Multi-AZ Standby) ]                │
│                                                                             │
│   Supporting Services:                                                      │
│   • AWS Secrets Manager (Encrypted DB credentials & SERVER_PEPPER)          │
│   • Amazon CloudWatch (Container Logs & Metrics)                            │
│   • Amazon ECR (Container Image Registry)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Infrastructure Specifications

| AWS Service | Recommended Tier (Launch) | High Availability / Scale Configuration |
| :--- | :--- | :--- |
| **ECS Fargate** | 2 Tasks (0.5 vCPU, 1 GB RAM each) | Auto-scaling based on CPU (>70%) or Memory (>80%), max 10 tasks |
| **RDS PostgreSQL** | `db.t4g.medium` (Multi-AZ enabled) | Aurora Serverless v2 (0.5 to 16 ACUs) |
| **RDS Proxy** | Enabled | Manages connection surges from web tasks |
| **CloudFront** | Price Class 100 (NA & Europe) or All | Caching for static assets (`/_next/static/*`, `/favicons/*`) |
| **AWS WAF** | Common Rule Set (CRS) + IP Rate Limiting | Protects voting endpoints from volumetric bot floods |
| **ACM** | Public Certificate | Auto-renewing TLS 1.3 certificate |
| **Secrets Manager** | 1 Secret (`psepho/production`) | Rotatable secrets for DB credentials, Pepper, and OAuth |

---

## 3. Step-by-Step AWS Setup

### Step 1: Prepare Next.js Standalone Dockerfile
To produce a lightweight, minimal container image (~120MB), enable Next.js standalone output in `apps/web/next.config.ts`:

```typescript
// apps/web/next.config.ts
const nextConfig = {
  output: 'standalone',
  // ... other configs
};
export default nextConfig;
```

Create a root `Dockerfile` optimized for the monorepo:

```dockerfile
# Multi-stage build for Psepho monorepo
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm turbo run build --filter=@psepho/web...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### Step 2: Build and Push to Amazon ECR
```bash
# Authenticate Docker to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build and tag
docker build -t psepho-web:latest .
docker tag psepho-web:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/psepho-web:latest

# Push
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/psepho-web:latest
```

### Step 3: Configure AWS Secrets Manager
Create a secret named `psepho/production/web`:
```json
{
  "DATABASE_URL": "postgresql://psepho_admin:<SECURE_PASSWORD>@<RDS_PROXY_ENDPOINT>:5432/psepho?sslmode=require",
  "SERVER_PEPPER": "<64_CHAR_HEX_RANDOM_SECRET>",
  "NEXT_PUBLIC_APP_URL": "https://psepho.org",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID": "<GOOGLE_CLIENT_ID>.apps.googleusercontent.com",
  "GOOGLE_CLIENT_SECRET": "<GOOGLE_CLIENT_SECRET>"
}
```

### Step 4: Provision RDS PostgreSQL & RDS Proxy
1. In the AWS RDS Console, launch a **PostgreSQL 15+** database.
2. Under **Availability & Durability**, select **Multi-AZ DB Instance** (creates a synchronous standby in another AZ).
3. Place the database inside **Private Subnets** with no public IP.
4. Attach a **Security Group** permitting ingress on port `5432` only from the ECS tasks security group and RDS Proxy.
5. Create an **AWS RDS Proxy**:
   - Engine: PostgreSQL.
   - IAM Role: Grants access to Secrets Manager DB credentials.
   - Subnets: Private application subnets.

### Step 5: Configure ECS Fargate Task Definition & Service
1. **ECS Cluster**: Create a VPC cluster `psepho-cluster`.
2. **Task Definition** (`psepho-web-task`):
   - Launch type: **Fargate**.
   - OS/Architecture: Linux/X86_64.
   - Task execution role: `ecsTaskExecutionRole` with Secrets Manager read permissions.
   - Container definition:
     - Image: `<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/psepho-web:latest`
     - Port mapping: `3000 TCP`.
     - Environment Secrets: Map each secret from `psepho/production/web`.
     - Logging: AWS CloudWatch Logs `/ecs/psepho-web`.
3. **ECS Service** (`psepho-web-service`):
   - Desired tasks: `2` (spread across availability zones).
   - Load Balancer: Attach to Application Load Balancer target group.
   - Health Check: Path `/api/auth/me`, HTTP 200, interval 30 seconds.

### Step 6: Configure CloudFront CDN & AWS WAF
1. Create a **CloudFront Distribution**:
   - Origin: ALB public DNS (`dualstack.psepho-alb-12345.us-east-1.elb.amazonaws.com`).
   - Allowed HTTP Methods: `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`.
   - Cache Policy:
     - Default behavior: `CachingDisabled` (forward all headers and cookies for dynamic voting & API responses).
     - Behavior for `/_next/static/*`: `CachingOptimized` (cache at edge for 1 year).
   - Viewer Protocol Policy: **Redirect HTTP to HTTPS**.
2. Attach **AWS WAF**:
   - Add Rate-based rule: Limit any single IP to **300 requests per 5-minute window** on `/api/polls/*/ballot`.
   - Attach AWS Managed Core Rule Set (protects against SQL injection, XSS).

### Step 7: Route 53 DNS & ACM Certificate
1. In **AWS Certificate Manager (ACM)**, request a public certificate for `psepho.org` and `*.psepho.org` in `us-east-1` (required for CloudFront).
2. Validate via DNS records in **Route 53**.
3. In Route 53, create an `A (Alias)` record pointing to the CloudFront distribution.

---

## 4. CI/CD Deployment with GitHub Actions

Automate container builds and ECS rolling deployments on push to `main`:

```yaml
name: Deploy to AWS ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS Credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<AWS_ACCOUNT_ID>:role/github-actions-deploy-role
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/psepho-web:$IMAGE_TAG -t $ECR_REGISTRY/psepho-web:latest .
          docker push $ECR_REGISTRY/psepho-web:$IMAGE_TAG
          docker push $ECR_REGISTRY/psepho-web:latest

      - name: Update ECS Service
        run: |
          aws ecs update-service --cluster psepho-cluster --service psepho-web-service --force-new-deployment
```

---

## 5. Alternative: AWS App Runner (Simplified Container Deployment)

If managing ECS clusters, ALBs, and VPC endpoints is too heavy for initial launch, **AWS App Runner** provides a fully managed alternative:
1. Connects directly to Amazon ECR.
2. Automatically provisions load balancers, TLS certificates, and autoscaling containers.
3. Simply set environment variables or point to AWS Secrets Manager in the App Runner console.
4. Supports persistent SSE streaming connections natively.
