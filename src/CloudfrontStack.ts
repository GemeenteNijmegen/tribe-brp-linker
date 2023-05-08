import {
  Stack,
  Duration,
  aws_certificatemanager as CertificateManager,
  aws_route53 as Route53,
  aws_route53_targets as Route53Targets,
  aws_ssm as SSM,
  aws_s3 as S3,
  aws_s3_deployment,
  aws_iam as IAM,
} from 'aws-cdk-lib';
import {
  Distribution,
  PriceClass,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
  AllowedMethods,
  ResponseHeadersPolicy,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  CachePolicy,
  OriginRequestHeaderBehavior,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CacheQueryStringBehavior,
  SecurityPolicyProtocol,
  OriginAccessIdentity,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { Statics } from './statics';

export class CloudfrontStack extends Stack {
  private zone?: IHostedZone;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const zone = this.hostedZone();

    const apiGatewayDomain = SSM.StringParameter.valueForStringParameter(this, Statics.ssmApiGatewayDomain);

    const cloudfrontDistribution = this.setCloudfrontStack(apiGatewayDomain, [zone.zoneName], this.certificateArn());
    this.addStaticResources(cloudfrontDistribution);
    this.addDnsRecords(cloudfrontDistribution);
  }

  /**
   * Get the certificate ARN from parameter store in us-east-1
   * @returns string Certificate ARN
   */
  private certificateArn() {
    const parameters = new RemoteParameters(this, 'params', {
      path: `${Statics.certificatePath}/`,
      region: 'us-east-1',
    });
    const certificateArn = parameters.get(Statics.certificateArn);
    return certificateArn;
  }

  /**
   * Add static contents to cloudfront
   *
   * Creates a bucket, deploys contents from a folder and adds it to
   * the cloudfront distribution.
   *
   * @param cloudfrontDistribution the distribution for these resources
   */
  private addStaticResources(cloudfrontDistribution: Distribution) {
    const staticResourcesBucket = this.staticResourcesBucket();
    const originAccessIdentity = new OriginAccessIdentity(this, 'publicresourcesbucket-oia');
    this.allowOriginAccessIdentityAccessToBucket(originAccessIdentity, staticResourcesBucket);
    cloudfrontDistribution.addBehavior(
      '/static/*',
      new S3Origin(staticResourcesBucket, {
        originAccessIdentity: originAccessIdentity,
      }),
      {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    );
    this.deployBucket(staticResourcesBucket, cloudfrontDistribution);
  }

  /**
   * Create a cloudfront distribution for the application
   *
   * Do not forward the Host header to API Gateway. This results in
   * an HTTP 403 because API Gateway won't be able to find an endpoint
   * on the cloudfront domain.
   *
   * @param {string} apiGatewayDomain the domain the api gateway can be reached at
   * @returns {Distribution} the cloudfront distribution
   */
  setCloudfrontStack(apiGatewayDomain: string, domainNames?: string[], certificateArn?: string): Distribution {
    const certificate = (certificateArn) ? CertificateManager.Certificate.fromCertificateArn(this, 'certificate', certificateArn) : undefined;
    if (!certificate) { domainNames = undefined; };

    const distribution = new Distribution(this, 'cf-distribution', {
      comment: 'Tribe BRP application',
      priceClass: PriceClass.PRICE_CLASS_100,
      domainNames,
      certificate,
      defaultBehavior: {
        origin: new HttpOrigin(apiGatewayDomain),
        originRequestPolicy: new OriginRequestPolicy(this, 'cf-originrequestpolicy', {
          headerBehavior: OriginRequestHeaderBehavior.allowList(
            'Accept-Charset',
            'Origin',
            'Accept',
            'Referer',
            'Accept-Language',
            'Accept-Datetime',
            'Content-Type',
          ),
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy: new CachePolicy(this, 'cf-caching', {
          cookieBehavior: CacheCookieBehavior.all(),
          headerBehavior: CacheHeaderBehavior.allowList('Authorization'),
          queryStringBehavior: CacheQueryStringBehavior.all(),
          defaultTtl: Duration.seconds(0),
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
        }),
        responseHeadersPolicy: this.responseHeadersPolicy(),
      },
      errorResponses: this.errorResponses(),
      logBucket: this.logBucket(),
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
    });
    return distribution;
  }

  private errorResponses() {
    const errorCodes = [400, 403, 404, 500, 503];
    return errorCodes.map(code => {
      return {
        httpStatus: code,
        responseHttpStatus: code,
        responsePagePath: `/static/http-errors/${code}.html`,
      };
    });
  }

  /**
   * Add DNS records for cloudfront to the Route53 Zone
   *
   * Requests to the custom domain will correctly use cloudfront.
   *
   * @param distribution the cloudfront distribution
   */
  addDnsRecords(distribution: Distribution) {
    const zone = this.hostedZone();

    new Route53.ARecord(this, 'a-record', {
      zone: zone,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(distribution)),
    });

    new Route53.AaaaRecord(this, 'aaaa-record', {
      zone: zone,
      target: Route53.RecordTarget.fromAlias(new Route53Targets.CloudFrontTarget(distribution)),
    });
  }

  private hostedZone() {
    if (!this.zone) {
      const zoneId = SSM.StringParameter.valueForStringParameter(this, Statics.ssmZoneId);
      const zoneName = SSM.StringParameter.valueForStringParameter(this, Statics.ssmZoneName);
      this.zone = Route53.HostedZone.fromHostedZoneAttributes(this, 'zone', {
        hostedZoneId: zoneId,
        zoneName: zoneName,
      });
    }
    return this.zone;
  }

  /**
   * Create a bucket to hold cloudfront logs
   * @returns s3.Bucket
   */
  logBucket() {
    const cfLogBucket = new S3.Bucket(this, 'CloudfrontLogs', {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: S3.BucketEncryption.S3_MANAGED,
      objectOwnership: S3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          id: 'delete objects after 180 days',
          enabled: true,
          expiration: Duration.days(180),
        },
      ],
    });
    return cfLogBucket;
  }


  /**
   * Get a set of (security) response headers to inject into the response
   * @returns {ResponseHeadersPolicy} cloudfront responseHeadersPolicy
   */
  responseHeadersPolicy(): ResponseHeadersPolicy {

    const responseHeadersPolicy = new ResponseHeadersPolicy(this, 'headers', {
      securityHeadersBehavior: {
        contentSecurityPolicy: { contentSecurityPolicy: this.cspHeaderValue(), override: true },
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: HeadersFrameOption.DENY, override: true },
        referrerPolicy: { referrerPolicy: HeadersReferrerPolicy.NO_REFERRER, override: true },
        strictTransportSecurity: { accessControlMaxAge: Duration.days(366), includeSubdomains: true, override: true },
      },
    });
    return responseHeadersPolicy;
  }

  /**
   * Get the cleaned, trimmed header values for the csp header
   *
   * @returns string csp header values
   */
  cspHeaderValue() {
    const cspValues = 'default-src \'self\';\
    frame-ancestors \'self\';\
    frame-src \'self\';\
    connect-src \'self\';\
    style-src \'self\'\
    script-src \'self\'\
    font-src \'self\'\
    img-src \'self\'\
    object-src \'none\';\
    ';
    return cspValues.replace(/[ ]+/g, ' ').trim();
  }

  /**
   * Create an s3 bucket to hold static resources.
   * Must be unencrypted to allow cloudfront to serve
   * these resources.
   *
   * @returns S3.Bucket
   */
  staticResourcesBucket() {
    const bucket = new S3.Bucket(this, 'resources-bucket', {
      blockPublicAccess: S3.BlockPublicAccess.BLOCK_ALL,
      eventBridgeEnabled: true,
      enforceSSL: true,
      encryption: S3.BucketEncryption.UNENCRYPTED,
    });

    return bucket;
  }

  /**
   * Allow listBucket to the origin access identity
   *
   * Necessary so cloudfront receives 404's as 404 instead of 403. This also allows
   * a listing of the bucket if no /index.html is present in the bucket.
   *
   * @param originAccessIdentity
   * @param bucket
   */
  allowOriginAccessIdentityAccessToBucket(originAccessIdentity: OriginAccessIdentity, bucket: S3.Bucket) {
    bucket.addToResourcePolicy(new IAM.PolicyStatement({
      resources: [
        `${bucket.bucketArn}`,
        `${bucket.bucketArn}/*`,
      ],
      actions: [
        's3:GetObject',
        's3:ListBucket',
      ],
      effect: IAM.Effect.ALLOW,
      principals: [originAccessIdentity.grantPrincipal],
    }),
    );
  }

  /**
   * Deploy contents of folder to the s3 bucket
   *
   * Invalidates the correct cloudfront path
   * @param bucket s3.Bucket
   * @param distribution Distribution
   */
  deployBucket(bucket: S3.Bucket, distribution: Distribution) {
    //Deploy static resources to s3
    new aws_s3_deployment.BucketDeployment(this, 'staticResources', {
      sources: [aws_s3_deployment.Source.asset('./src/app/static-resources/')],
      destinationBucket: bucket,
      distribution: distribution,
      distributionPaths: ['/static/*'],
    });
  }
}
