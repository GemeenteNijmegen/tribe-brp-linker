import { aws_certificatemanager as CertificateManager, Stack, StackProps, aws_ssm as SSM, RemovalPolicy } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { RemoteParameters } from 'cdk-remote-stack';
import { Construct } from 'constructs';
import { Statics } from './statics';

export interface UsEastCertificateStackProps extends StackProps {
  branch: string;
}

export class UsEastCertificateStack extends Stack {

  constructor(scope: Construct, id: string, props: UsEastCertificateStackProps) {
    super(scope, id, props);
    this.createCertificate();
  }

  getZoneAttributes(parameters: RemoteParameters, id: string, name: string): { hostedZoneId: string; zoneName: string} {
    const zoneId = parameters.get(id);
    const zoneName = parameters.get(name);
    return {
      hostedZoneId: zoneId,
      zoneName: zoneName,
    };
  }

  createCertificate() {
    const parameters = new RemoteParameters(this, 'params', {
      path: `${Statics.ssmZonePath}/`,
      region: Stack.of(this).region,
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
