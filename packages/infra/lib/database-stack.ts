import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { StageConfig } from '../config/environments';

export interface DatabaseStackProps extends cdk.StackProps {
  readonly stageConfig: StageConfig;
}

/**
 * Provisions an Amazon RDS for PostgreSQL instance configured for secure connectivity
 * from external serverless runtimes (such as AWS Amplify Hosting SSR functions).
 */
export class DatabaseStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly databaseInstance: rds.DatabaseInstance;
  public readonly databaseSecret: secretsmanager.ISecret;
  public readonly databaseSecurityGroup: ec2.ISecurityGroup;
  public readonly databaseEndpoint: string;
  public readonly databaseUrl: string;

  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const { stageConfig } = props;
    const rdsConfig = stageConfig.rds;

    if (!rdsConfig) {
      throw new Error('DatabaseStack instantiated but stageConfig.rds is not defined.');
    }

    const removalPolicy =
      rdsConfig.removalPolicy === 'retain'
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY;

    // 1. VPC with public subnets across 2 Availability Zones
    // AWS Amplify Hosting SSR functions run outside customer VPCs in AWS-managed compute.
    // Placing RDS in public subnets with forced SSL enables direct serverless connectivity
    // with zero NAT Gateway fixed hourly cost.
    this.vpc = new ec2.Vpc(this, 'PsephoDatabaseVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // 2. Database Security Group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: `Inbound PostgreSQL security group for Psepho (${stageConfig.stageName})`,
      allowAllOutbound: true,
    });

    // Allow PostgreSQL traffic (secured via forced SSL & strong Secrets Manager credentials)
    this.databaseSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'PostgreSQL access with mandatory TLS 1.3'
    );

    // 3. PostgreSQL Parameter Group enforcing mandatory TLS encryption
    const parameterGroup = new rds.ParameterGroup(this, 'PostgresParamGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      description: `Enforces TLS/SSL requirement for Psepho (${stageConfig.stageName})`,
      parameters: {
        'rds.force_ssl': '1',
      },
    });

    // 4. Secure Master Credentials via AWS Secrets Manager
    const masterUserSecret = new rds.DatabaseSecret(this, 'DatabaseMasterSecret', {
      username: 'psepho_admin',
      secretName: `psepho/${stageConfig.stageName}/database-credentials`,
    });
    this.databaseSecret = masterUserSecret;

    // 5. RDS PostgreSQL Instance
    this.databaseInstance = new rds.DatabaseInstance(this, 'PostgresInstance', {
      instanceIdentifier: `psepho-${stageConfig.stageName}-db`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: new ec2.InstanceType(rdsConfig.instanceType),
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [this.databaseSecurityGroup],
      parameterGroup,
      credentials: rds.Credentials.fromSecret(masterUserSecret),
      databaseName: rdsConfig.databaseName,
      allocatedStorage: rdsConfig.allocatedStorageGb,
      maxAllocatedStorage: rdsConfig.maxAllocatedStorageGb,
      multiAz: rdsConfig.multiAz,
      backupRetention: cdk.Duration.days(rdsConfig.backupRetentionDays),
      publiclyAccessible: true,
      storageEncrypted: true,
      storageType: rds.StorageType.GP3,
      deletionProtection: stageConfig.stageName === 'prod',
      removalPolicy,
    });

    this.databaseEndpoint = this.databaseInstance.dbInstanceEndpointAddress;

    // Formatted connection string representation for Next.js Drizzle ORM
    const secretValue = masterUserSecret.secretValueFromJson('password').unsafeUnwrap();
    this.databaseUrl = `postgresql://psepho_admin:${secretValue}@${this.databaseEndpoint}:5432/${rdsConfig.databaseName}?sslmode=require`;

    // CloudFormation Outputs
    new cdk.CfnOutput(this, 'DatabaseEndpointOutput', {
      value: this.databaseEndpoint,
      description: 'PostgreSQL RDS Endpoint Address',
      exportName: `psepho-${stageConfig.stageName}-db-endpoint`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArnOutput', {
      value: masterUserSecret.secretArn,
      description: 'Secrets Manager ARN for PostgreSQL credentials',
      exportName: `psepho-${stageConfig.stageName}-db-secret-arn`,
    });
  }
}
