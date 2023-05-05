export abstract class Statics {
  static readonly projectName: string = 'tribe-brp-linker';

  static readonly subDomain: string = 'tribebrp';

  /**
   * Repo information
   */

  static readonly repository: string = 'tribe-brp-linker';
  static readonly repositoryOwner: string = 'GemeenteNijmegen';

  // Managed in dns-managment project:
  // Below references csp-nijmegen hosted zone
  static readonly accountRootHostedZonePath: string = '/gemeente-nijmegen/account/hostedzone';
  static readonly accountRootHostedZoneId: string = '/gemeente-nijmegen/account/hostedzone/id';
  static readonly accountRootHostedZoneName: string = '/gemeente-nijmegen/account/hostedzone/name';
  // The KSM key parameters for each account
  static readonly ssmAccountDnsSecKmsKey: string = '/gemeente-nijmegen/account/dnssec/kmskey/arn';

  /**
   * Route53 Zone ID and name for the zone for the application. decouples stacks to not pass
   * the actual zone between stacks. This param is set by DNSStack and should not be modified after.
   */
  static readonly ssmZonePath: string = `/${this.projectName}/zones`;
  static readonly ssmZoneId: string = `/${this.projectName}/zones/zone-id`;
  static readonly ssmZoneName: string = `/${this.projectName}/zones/zone-name`;

  static readonly ssmApiGatewayDomain: string = `/${this.projectName}/apigateway-domain`;

  /** There seems to be no way to get the required ds record value in the CDK/API */
  static readonly ssmNijmegenDSRecordValue: string = `/${this.projectName}/ds-record-value`;

  static readonly certificatePath: string = `/${this.projectName}/certificates`;
  static readonly certificateArn: string = `/${this.projectName}/certificates/certificate-arn`;

  /**
   * Authentication URL base, used in auth and login lambda
   */
  static readonly ssmAuthUrlBaseParameter: string = `/${this.projectName}/authUrlBase`;

  /**
   * Authentication URL base, used in auth and login lambda
   */
  static readonly ssmAuthOrgId: string = `/${this.projectName}/AuthOrgId`;

  /**
   *
    * OpenID Connect client ID (sent in URL as querystring-param, not secret)
    */
  static readonly ssmOIDCClientID: string = `/${this.projectName}/authClientID`;
  /**
    * OpenID Connect scope
    */
  static readonly ssmOIDCScope: string = `/${this.projectName}/authScope`;

  /**
    * OpenID Connect secret name
    */
  static readonly secretOIDCClientSecret: string = `/${this.projectName}/oidc-clientsecret`;

  /**
    * Certificate private key for mTLS
    */
  static readonly secretMTLSPrivateKey: string = `/${this.projectName}/mtls-privatekey`;

  /**
    * Certificate for mTLS
    */
  static readonly ssmMTLSClientCert: string = `/${this.projectName}/mtls-clientcert`;

  /**
     * Root CA for mTLS (PKIO root)
     */
  static readonly ssmMTLSRootCA: string = `/${this.projectName}/mtls-rootca`;

  static readonly ssmBrpApiEndpointUrl: string = `/${this.projectName}/brp-api-url`;

  static readonly ssmSessionsTableArn: string = `/${this.projectName}/sessionstable-arn`;

  static readonly ssmDataKeyArn: string = `/${this.projectName}/kms-datakey-arn`;

}
