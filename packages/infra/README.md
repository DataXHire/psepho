# @psepho/infra: AWS CDK Deployment Guide

Infrastructure as Code (IaC) using **AWS CDK v2 (TypeScript)** to automate deploying **Psepho** to **AWS Amplify Hosting** (Next.js 15 App Router SSR) and an optional **Amazon RDS for PostgreSQL** database.

---

## 1. Architecture & Database Strategy

```
                                    ┌───────────────────────────────────┐
                                    │        GitHub Repository          │
                                    │    (DataXHire/psepho:main)        │
                                    └─────────────────┬─────────────────┘
                                                      │ Auto-build trigger
                                                      ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                                AWS Amplify Hosting                                    │
│                                                                                       │
│   • Next.js 15 App Router SSR (Amplify Web Compute)                                   │
│   • Global CDN & Managed TLS/SSL Certificate                                          │
│   • Automated pnpm monorepo build pipeline via amplify.yml                            │
│   • Environment variables injected securely at build & runtime                        │
└─────────────────────────────────────────────┬─────────────────────────────────────────┘
                                              │ Inbound TLS 1.3 (Port 5432)
                                              ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database (Two Options)                           │
│                                                                                       │
│  Option A (AWS-Native): Amazon RDS PostgreSQL 16 (AWS Graviton, KMS Encrypted)        │
│  Option B (Serverless): Neon or Supabase (Built-in PgBouncer pooling on port 6543)    │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

### Why Amazon RDS vs. Serverless PostgreSQL (Neon / Supabase)?
* **AWS CDK provisions AWS resources**: CDK cannot register third-party accounts like Neon or Supabase. To provide a complete, turnkey deployment inside a customer's AWS account, CDK includes Amazon RDS for PostgreSQL.
* **Serverless Postgres (Neon/Supabase)** remains an excellent choice for Amplify Hosting because its built-in PgBouncer pooler natively absorbs serverless Lambda connection bursts.
* **You choose via a single toggle**: Set `deployRds: true` for an all-AWS stack, or `deployRds: false` (or CLI flag `-c deployRds=false`) to connect Amplify to Neon or Supabase.

---

## 2. Prerequisites (One-Time Setup)

### 1. Install & Configure AWS CLI
```bash
aws configure
# Verify credentials:
aws sts get-caller-identity
```

### 2. Bootstrap AWS CDK in your target Region
```bash
# Bootstrap your account and region (e.g., us-east-1)
pnpm --filter @psepho/infra cdk bootstrap aws://$(aws sts get-caller-identity --query Account --output text)/${AWS_REGION:-us-east-1}
```

### 3. Store GitHub Personal Access Token (PAT)
Amplify requires a GitHub Personal Access Token (with `repo` and `admin:repo_hook` scopes) to clone your repository and configure auto-deploy webhooks.

Create the secret in AWS Secrets Manager:
```bash
# For Dev:
aws secretsmanager create-secret \
  --name "psepho/dev/github-token" \
  --secret-string "ghp_yourGitHubTokenHere" \
  --region ${AWS_REGION:-us-east-1}

# For Prod:
aws secretsmanager create-secret \
  --name "psepho/prod/github-token" \
  --secret-string "ghp_yourGitHubTokenHere" \
  --region ${AWS_REGION:-us-east-1}
```
*(Alternatively, you can pass `-c githubToken=ghp_...` directly on the CLI).*

---

## 3. Initial Deployment (From Scratch)

### Path A: Deploy All-in-One AWS Stack (Amplify + Amazon RDS)

```bash
# 1. Preview generated CloudFormation templates
pnpm cdk:synth

# 2. Review diff against your AWS account
pnpm cdk:diff

# 3. Deploy Dev environment
pnpm cdk:deploy:dev

# (When ready for Production with Multi-AZ RDS):
# pnpm cdk:deploy:prod
```

### Path B: Deploy Amplify Only (Using External Neon / Supabase Database)

If you already have a PostgreSQL connection string from Neon or Supabase:

```bash
# Synthesize with external database
pnpm cdk:synth -c deployRds=false -c databaseUrl="postgresql://user:pass@ep-xxx.neon.tech/psepho?sslmode=require"

# Deploy to AWS Amplify
pnpm --filter @psepho/infra cdk deploy --all \
  -c stage=dev \
  -c deployRds=false \
  -c databaseUrl="postgresql://user:pass@ep-xxx.neon.tech/psepho?sslmode=require"
```

---

## 4. Post-Deployment: Database Initialization

Once the database stack is provisioned, retrieve the connection URL and run migrations:

```bash
# 1. Get database endpoint from CloudFormation outputs:
aws cloudformation describe-stacks \
  --stack-name psepho-dev-database \
  --query "Stacks[0].Outputs[?OutputKey=='DatabaseEndpointOutput'].OutputValue" \
  --output text

# 2. Retrieve the master password from Secrets Manager:
aws secretsmanager get-secret-value \
  --secret-id "psepho/dev/database-credentials" \
  --query SecretString \
  --output text

# 3. Export DATABASE_URL and run Drizzle migrations from the repo root:
export DATABASE_URL="postgresql://psepho_admin:<PASSWORD>@<DB_ENDPOINT>:5432/psepho?sslmode=require"

pnpm --filter @psepho/web db:migrate

# 4. (Optional) Seed sample civic polls and demo data:
pnpm --filter @psepho/web db:seed
```

---

## 5. Updating Deployments

### Updating Application Code (Automated via Git)
Amplify Hosting automatically listens to pushes on your tracked branch (`main`):
```bash
git add .
git commit -m "feat: new poll capability"
git push origin main
```
Amplify will automatically detect the commit, run `amplify.yml`, build the Next.js bundle, and release zero-downtime updates.

### Updating Infrastructure / Environment Variables
When editing CDK constructs, environment settings, or adding secrets:
```bash
# 1. Check changes
pnpm cdk:diff

# 2. Deploy infrastructure update
pnpm cdk:deploy:dev
```

### Triggering a Manual Re-deployment in Amplify
If you want to re-deploy without making a new git commit:
```bash
# Get your Amplify App ID
APP_ID=$(aws cloudformation describe-stacks \
  --stack-name psepho-dev-amplify \
  --query "Stacks[0].Outputs[?OutputKey=='AmplifyAppIdOutput'].OutputValue" \
  --output text)

# Trigger a build on branch 'main'
aws amplify start-job --app-id $APP_ID --branch-name main --job-type RELEASE
```

---

## 6. Observability & Troubleshooting

```bash
# View recent Amplify build status
aws amplify list-jobs --app-id $APP_ID --branch-name main --max-items 3

# View RDS CloudWatch CPU / Connection Metrics
aws cloudwatch get-metric-data ...
```

---

## 7. Teardown & Cost Management

To delete all provisioned AWS resources and prevent ongoing billing:

```bash
# Destroy Dev stacks (Amplify App & RDS Database)
pnpm --filter @psepho/infra destroy:dev
```
*(For production, RDS instances have `removalPolicy: retain` to protect data; delete the snapshot in the RDS Console if no longer needed).*
