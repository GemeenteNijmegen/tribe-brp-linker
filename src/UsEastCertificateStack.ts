import { RemoteParameters } from '@gemeentenijmegen/cross-region-parameters';
import { aws_certificatemanager as CertificateManager, Stack, StackProps, aws_ssm as SSM, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { Statics } from './statics';

export interface UsEastCertificateStackProps extends StackProps {
  branch: string;
  appRegion: string;
}

export class UsEastCertificateStack extends Stack {

  constructor(scope: Construct, id: string, props: UsEastCertificateStackProps) {
    super(scope, id, props);
    this.createCertificate(props.appRegion);
  }

  getZoneAttributes(parameters: RemoteParameters, id: string, name: string): { hostedZoneId: string; zoneName: string } {
    const zoneId = parameters.get(id);
    const zoneName = parameters.get(name);
    return {
      hostedZoneId: zoneId,
      zoneName: zoneName,
    };
  }

  createCertificate(region: string) {
    const parameters = new RemoteParameters(this, 'params', {
      path: `${Statics.ssmZonePath}/`,
      region,
      timeout: Duration.seconds(10),
    });
    const zoneParams = this.getZoneAttributes(parameters, Statics.ssmZoneId, Statics.ssmZoneName);
    const zone = HostedZone.fromHostedZoneAttributes(this, 'zone', zoneParams);
    const cspDomain = zoneParams.zoneName;


    const certificate = new CertificateManager.Certificate(this, 'certificate', {
      domainName: cspDomain,
      validation: CertificateManager.CertificateValidation.fromDns(zone),
    });
    certificate.applyRemovalPolicy(RemovalPolicy.DESTROY);

    new SSM.StringParameter(this, 'cert-arn', {
      stringValue: certificate.certificateArn,
      parameterName: Statics.certificateArn,
    });

  }
}
