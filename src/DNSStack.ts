import { aws_route53 as Route53, Stack, StackProps, aws_ssm as SSM, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Statics } from './statics';

export interface DNSStackProps extends StackProps {
  branch: string;
}

export class DNSStack extends Stack {
  zone: Route53.HostedZone;
  accountRootZone: Route53.IHostedZone;
  branch: string;

  constructor(scope: Construct, id: string, props: DNSStackProps) {
    super(scope, id);
    this.branch = props.branch;

    const rootZoneId = SSM.StringParameter.valueForStringParameter(this, Statics.accountRootHostedZoneId);
    const rootZoneName = SSM.StringParameter.valueForStringParameter(this, Statics.accountRootHostedZoneName);

    this.accountRootZone = Route53.HostedZone.fromHostedZoneAttributes(this, 'cspzone', {
      hostedZoneId: rootZoneId,
      zoneName: rootZoneName,
    });

    this.zone = new Route53.HostedZone(this, 'tribebrp-csp', {
      zoneName: `tribebrp.${this.accountRootZone.zoneName}`,
    });

    this.addZoneIdAndNametoParams();
    this.addNSToRootCSPzone();
    this.addDsRecord();

  }

  /**
   * Export zone id and name to parameter store
   * for use in other stages (Cloudfront).
   */
  private addZoneIdAndNametoParams() {
    new SSM.StringParameter(this, 'hostedzone-id', {
      stringValue: this.zone.hostedZoneId,
      parameterName: Statics.ssmZoneId,
    });

    new SSM.StringParameter(this, 'hostedzone-name', {
      stringValue: this.zone.zoneName,
      parameterName: Statics.ssmZoneName,
    });

  }

  /**
   * Add the Name servers from the newly defined zone to
   * the root zone for csp-nijmegen.nl. This will only
   * have an actual effect in the prod. account.
   *
   * @returns null
   */
  addNSToRootCSPzone() {
    if (!this.zone.hostedZoneNameServers) { return; }
    new Route53.NsRecord(this, 'ns-record', {
      zone: this.accountRootZone,
      values: this.zone.hostedZoneNameServers,
      recordName: 'tribebrp',
    });
  }

  /**
   * Add DS record for the zone to the parent zone
   * to establish a chain of trust (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-configuring-dnssec-enable-signing.html#dns-configuring-dnssec-chain-of-trust)
   */
  addDsRecord() {
    let dsValue = '';
    switch (this.branch) {
      case 'acceptance':
        dsValue = '52561 13 2 90CF3C35FDDC30AF42FB4BCCDCCB1123500050D70F1D4886D6DE25502F3BC50A';
        break;
      case 'production':
        dsValue = '60066 13 2 932CD585B029E674E17C4C33DFE7DE2C84353ACD8C109760FD17A6CDBD0CF3FA';
        break;
      default:
        break;
    }
    new Route53.DsRecord(this, 'ds-record', {
      zone: this.accountRootZone,
      recordName: 'tribebrp',
      values: [dsValue],
      ttl: Duration.seconds(600),
    });
  }
}