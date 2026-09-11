#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { getStageConfig } from '../config/environments';
import { DatabaseStack } from '../lib/database-stack';
import { AmplifyStack } from '../lib/amplify-stack';

const app = new cdk.App();

// 1. Resolve Stage and Configuration
const stageName = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
const stageConfig = getStageConfig(stageName);

// 2. Resolve AWS Account & Region
const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: stageConfig.region || process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// 3. Provision Database Stack if configured
let databaseUrl: string | undefined;
let databaseStack: DatabaseStack | undefined;

const deployRdsContext = app.node.tryGetContext('deployRds');
const shouldDeployRds =
  deployRdsContext !== undefined
    ? deployRdsContext === 'true' || deployRdsContext === true
    : stageConfig.deployRds;

if (shouldDeployRds) {
  databaseStack = new DatabaseStack(app, `psepho-${stageName}-database`, {
    env,
    stageConfig,
    description: `Amazon RDS PostgreSQL database stack for Psepho (${stageName})`,
  });
  databaseUrl = databaseStack.databaseUrl;
} else {
  // Use external database URL from context or environment (e.g. Neon / Supabase)
  databaseUrl =
    app.node.tryGetContext('databaseUrl') ||
    process.env.DATABASE_URL;
}

// 4. Provision AWS Amplify Hosting Stack
const amplifyStack = new AmplifyStack(app, `psepho-${stageName}-amplify`, {
  env,
  stageConfig,
  databaseUrl,
  description: `AWS Amplify Next.js 15 Web Compute stack for Psepho (${stageName})`,
});

// Ensure Amplify deploys after Database is provisioned
if (databaseStack) {
  amplifyStack.addStackDependency(databaseStack);
}

// 5. Global Tags
cdk.Tags.of(app).add('Project', 'psepho');
cdk.Tags.of(app).add('Environment', stageName);
cdk.Tags.of(app).add('ManagedBy', 'AWS-CDK');

app.synth();
