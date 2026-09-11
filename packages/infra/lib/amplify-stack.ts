import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StageConfig } from '../config/environments';

export interface AmplifyStackProps extends cdk.StackProps {
  readonly stageConfig: StageConfig;
  readonly databaseUrl?: string;
}

/**
 * Provisions the AWS Amplify Hosting Application for Psepho.
 * Uses Amplify Web Compute (`platform: 'WEB_COMPUTE'`) to natively execute Next.js 15 App Router SSR.
 */
export class AmplifyStack extends cdk.Stack {
  public readonly amplifyApp: amplify.CfnApp;
  public readonly amplifyBranch: amplify.CfnBranch;
  public readonly appUrl: string;

  constructor(scope: Construct, id: string, props: AmplifyStackProps) {
    super(scope, id, props);

    const { stageConfig, databaseUrl } = props;
    const { amplify: ampConfig } = stageConfig;

    // 1. IAM Service Role for Amplify Hosting
    const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: `Amplify service role for Psepho (${stageConfig.stageName})`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'),
      ],
    });

    // 2. Resolve GitHub Access Token
    // Can be provided via CDK context (-c githubToken=...) or read from AWS Secrets Manager
    const contextToken = this.node.tryGetContext('githubToken');
    const oauthToken = contextToken
      ? contextToken
      : cdk.SecretValue.secretsManager(ampConfig.githubTokenSecretName).unsafeUnwrap();

    // 3. Resolve Environment Variables
    const envVars: { [key: string]: string } = {
      AMPLIFY_DIFF_DEPLOY: 'false',
      AMPLIFY_MONOREPO_APP_ROOT: 'apps/web',
      NEXT_PUBLIC_APP_URL: ampConfig.appUrl,
      NODE_ENV: stageConfig.stageName === 'prod' ? 'production' : 'development',
    };

    // Inject Database Connection String if available
    if (databaseUrl) {
      envVars.DATABASE_URL = databaseUrl;
    }

    // Embed build specification directly to guarantee reproducible CI/CD execution
    const buildSpecYaml = `
version: 1
applications:
  - appRoot: apps/web
    frontend:
      phases:
        preBuild:
          commands:
            - corepack enable
            - corepack prepare pnpm@latest --activate
            - pnpm --version
            - pnpm install --frozen-lockfile
        build:
          commands:
            - env | grep -E '^(DATABASE_URL|SERVER_PEPPER|NEXT_PUBLIC_|GOOGLE_)' >> .env.production || true
            - pnpm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
          - $(pnpm store path)/**/*
          - .next/cache/**/*
`;

    // 4. Provision Amplify App
    this.amplifyApp = new amplify.CfnApp(this, 'PsephoAmplifyApp', {
      name: `${ampConfig.appName}`,
      description: `Psepho Civic Polling Web Application (${stageConfig.stageName})`,
      repository: ampConfig.repoUrl,
      platform: 'WEB_COMPUTE', // REQUIRED for Next.js 15 SSR App Router
      iamServiceRole: amplifyRole.roleArn,
      oauthToken,
      environmentVariables: Object.entries(envVars).map(([name, value]) => ({
        name,
        value,
      })),
      buildSpec: buildSpecYaml.trim(),
      customRules: [
        {
          source: '/<*>',
          target: '/index.html',
          status: '404-200',
        },
      ],
    });

    // 5. Connect Branch (e.g., 'main')
    this.amplifyBranch = new amplify.CfnBranch(this, 'PsephoBranch', {
      appId: this.amplifyApp.attrAppId,
      branchName: ampConfig.branchName,
      enableAutoBuild: true,
      stage: stageConfig.stageName === 'prod' ? 'PRODUCTION' : 'DEVELOPMENT',
      framework: 'Next.js - SSR',
    });

    // 6. Optional Custom Domain Mapping
    if (ampConfig.customDomain) {
      new amplify.CfnDomain(this, 'PsephoCustomDomain', {
        appId: this.amplifyApp.attrAppId,
        domainName: ampConfig.customDomain,
        subDomainSettings: [
          {
            branchName: ampConfig.branchName,
            prefix: '',
          },
          {
            branchName: ampConfig.branchName,
            prefix: 'www',
          },
        ],
      });
    }

    this.appUrl = `https://${ampConfig.branchName}.${this.amplifyApp.attrDefaultDomain}`;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'AmplifyAppIdOutput', {
      value: this.amplifyApp.attrAppId,
      description: 'Amplify Application ID',
      exportName: `psepho-${stageConfig.stageName}-amplify-app-id`,
    });

    new cdk.CfnOutput(this, 'AmplifyDefaultDomainOutput', {
      value: this.amplifyApp.attrDefaultDomain,
      description: 'Amplify Default Domain',
      exportName: `psepho-${stageConfig.stageName}-amplify-default-domain`,
    });

    new cdk.CfnOutput(this, 'AmplifyBranchUrlOutput', {
      value: this.appUrl,
      description: 'Direct Amplify Branch Preview URL',
    });
  }
}
