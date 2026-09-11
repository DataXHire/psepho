export interface RdsConfig {
  readonly instanceType: string;
  readonly allocatedStorageGb: number;
  readonly maxAllocatedStorageGb: number;
  readonly databaseName: string;
  readonly backupRetentionDays: number;
  readonly multiAz: boolean;
  readonly removalPolicy: 'destroy' | 'retain';
}

export interface AmplifyConfig {
  readonly appName: string;
  readonly repoUrl: string;
  readonly branchName: string;
  readonly githubTokenSecretName: string;
  readonly appUrl: string;
  readonly serverPepperSecretName: string;
  readonly googleClientIdSecretName?: string;
  readonly googleClientSecretName?: string;
  readonly customDomain?: string;
}

export interface StageConfig {
  readonly stageName: 'dev' | 'prod';
  readonly region: string;
  readonly deployRds: boolean;
  readonly externalDatabaseUrlSecretName?: string;
  readonly rds?: RdsConfig;
  readonly amplify: AmplifyConfig;
}

export const environments: Record<'dev' | 'prod', StageConfig> = {
  dev: {
    stageName: 'dev',
    region: process.env.AWS_REGION || 'us-east-1',
    // By default, deploy a lightweight RDS Postgres db.t4g.micro for dev
    deployRds: true,
    rds: {
      instanceType: 't4g.micro',
      allocatedStorageGb: 20,
      maxAllocatedStorageGb: 50,
      databaseName: 'psepho',
      backupRetentionDays: 1,
      multiAz: false,
      removalPolicy: 'destroy',
    },
    amplify: {
      appName: 'psepho-web-dev',
      repoUrl: 'https://github.com/DataXHire/psepho',
      branchName: 'main',
      githubTokenSecretName: 'psepho/dev/github-token',
      appUrl: 'https://dev.psepho.org',
      serverPepperSecretName: 'psepho/dev/server-pepper',
      googleClientIdSecretName: 'psepho/dev/google-client-id',
      googleClientSecretName: 'psepho/dev/google-client-secret',
    },
  },
  prod: {
    stageName: 'prod',
    region: process.env.AWS_REGION || 'us-east-1',
    // Set deployRds: true to provision production Multi-AZ RDS Postgres,
    // or false if using high-throughput serverless Neon/Supabase with built-in PgBouncer.
    deployRds: true,
    rds: {
      instanceType: 't4g.medium',
      allocatedStorageGb: 50,
      maxAllocatedStorageGb: 200,
      databaseName: 'psepho',
      backupRetentionDays: 14,
      multiAz: true,
      removalPolicy: 'retain',
    },
    amplify: {
      appName: 'psepho-web-prod',
      repoUrl: 'https://github.com/DataXHire/psepho',
      branchName: 'main',
      githubTokenSecretName: 'psepho/prod/github-token',
      appUrl: 'https://psepho.org',
      serverPepperSecretName: 'psepho/prod/server-pepper',
      googleClientIdSecretName: 'psepho/prod/google-client-id',
      googleClientSecretName: 'psepho/prod/google-client-secret',
      customDomain: 'psepho.org',
    },
  },
};

export function getStageConfig(stageName?: string): StageConfig {
  const stage = (stageName || process.env.STAGE || 'dev').toLowerCase() as 'dev' | 'prod';
  const config = environments[stage];
  if (!config) {
    throw new Error(`Unknown stage: "${stageName}". Valid options are 'dev' or 'prod'.`);
  }
  return config;
}
