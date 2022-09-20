import { aws_route53 as Route53, Stack, aws_ssm as SSM } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Statics } from './statics';


export class DNSStack extends Stack {
  zone: Route53.HostedZone;
  accountRootZone: Route53.IHostedZone;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const rootZoneId = SSM.StringParameter.valueForStringParameter(this, Statics.accountRootHostedZoneId);
    const rootZoneName = SSM.StringParameter.valueForStringParameter(this, Statics.accountRootHostedZoneName);

    this.accountRootZone = Route53.HostedZone.fromHostedZoneAttributes(this, 'cspzone', {
      hostedZoneId: rootZoneId,
      zoneName: rootZoneName,
    });

    const zoneName = `${Statics.subDomain}.${this.accountRootZone.zoneName}`;
    this.zone = new Route53.HostedZone(this, 'tribebrp-zone', {
      zoneName,
    });

    // Register the new zone in the account root zone
    if (!this.zone.hostedZoneNameServers) {
      throw 'No name servers found for our hosted zone, cannot create dns stack';
    }

    new Route53.ZoneDelegationRecord(this, 'project-zone-delegation', {
      nameServers: this.zone.hostedZoneNameServers,
      zone: this.accountRootZone,
      recordName: zoneName,
    });
    this.addZoneIdAndNametoParams();

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
}