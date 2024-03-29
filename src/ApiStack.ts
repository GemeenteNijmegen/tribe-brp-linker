import { aws_secretsmanager, Stack, StackProps, aws_ssm as SSM } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { ApiFunction } from './ApiFunction';
import { AuthFunction } from './app/auth/auth-function';
import { HomeFunction } from './app/home/home-function';
import { LinkuserFunction } from './app/linkuser/linkuser-function';
import { LoginFunction } from './app/login/login-function';
import { LogoutFunction } from './app/logout/logout-function';
import { SessionsTable } from './SessionsTable';
import { Statics } from './statics';

export interface ApiStackProps extends StackProps {
  sessionsTable: SessionsTable;
  branch: string;
  // zone: HostedZone;
}

/**
 * The API Stack creates the API Gateway and related
 * lambda's. It requires supporting resources (such as the
 * DynamoDB sessions table to be provided and thus created first)
 */
export class ApiStack extends Stack {
  private sessionsTable: Table;
  api: HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id);
    this.sessionsTable = props.sessionsTable.table;
    this.api = new HttpApi(this, 'api', {
      description: 'Tribe to BRP webapplicatie',
    });

    const appDomain = SSM.StringParameter.valueForStringParameter(this, Statics.ssmZoneName);;

    new SSM.StringParameter(this, 'hostedzone-id', {
      stringValue: this.domain(),
      parameterName: Statics.ssmApiGatewayDomain,
    });

    this.setFunctions(`https://${appDomain}/`);
  }

  /**
   * Create and configure lambda's for all api routes, and
   * add routes to the gateway.
   * @param {string} baseUrl the application url
   */
  setFunctions(baseUrl: string) {
    const loginFunction = new ApiFunction(this, 'login-function', {
      apiFunction: LoginFunction,
      description: 'Login-pagina voor de BRP koppeling.',
      codePath: 'app/login',
      table: this.sessionsTable,
      tablePermissions: 'ReadWrite',
      applicationUrlBase: baseUrl,
    });

    const logoutFunction = new ApiFunction(this, 'logout-function', {
      apiFunction: LogoutFunction,
      description: 'Uitlog-pagina voor de BRP koppeling.',
      codePath: 'app/logout',
      table: this.sessionsTable,
      tablePermissions: 'ReadWrite',
      applicationUrlBase: baseUrl,
    });

    const oidcSecret = aws_secretsmanager.Secret.fromSecretNameV2(this, 'oidc-secret', Statics.secretOIDCClientSecret);
    const authFunction = new ApiFunction(this, 'auth-function', {
      apiFunction: AuthFunction,
      description: 'Authenticatie-lambd voor de BRP koppeling.',
      codePath: 'app/auth',
      table: this.sessionsTable,
      tablePermissions: 'ReadWrite',
      applicationUrlBase: baseUrl,
      environment: {
        CLIENT_SECRET_ARN: oidcSecret.secretArn,
      },
    });
    oidcSecret.grantRead(authFunction.lambda);

    const secretMTLSPrivateKey = aws_secretsmanager.Secret.fromSecretNameV2(this, 'tls-key-secret', Statics.secretMTLSPrivateKey);
    const tlskeyParam = SSM.StringParameter.fromStringParameterName(this, 'tlskey', Statics.ssmMTLSClientCert);
    const tlsRootCAParam = SSM.StringParameter.fromStringParameterName(this, 'tlsrootca', Statics.ssmMTLSRootCA);
    const homeFunction = new ApiFunction(this, 'home-function', {
      apiFunction: HomeFunction,
      description: 'Home-lambda voor de BRP koppeling.',
      codePath: 'app/home',
      table: this.sessionsTable,
      tablePermissions: 'ReadWrite',
      applicationUrlBase: baseUrl,
      environment: {
        MTLS_PRIVATE_KEY_ARN: secretMTLSPrivateKey.secretArn,
        MTLS_CLIENT_CERT_NAME: Statics.ssmMTLSClientCert,
        MTLS_ROOT_CA_NAME: Statics.ssmMTLSRootCA,
        BRP_API_URL: SSM.StringParameter.valueForStringParameter(this, Statics.ssmBrpApiEndpointUrl),
        CLIENT_SECRET_ARN: oidcSecret.secretArn,
      },
    });
    secretMTLSPrivateKey.grantRead(homeFunction.lambda);
    tlskeyParam.grantRead(homeFunction.lambda);
    tlsRootCAParam.grantRead(homeFunction.lambda);
    oidcSecret.grantRead(homeFunction.lambda);


    const linkUserFunction = new ApiFunction(this, 'linkuser-function', {
      apiFunction: LinkuserFunction,
      description: 'Link user-lambda voor de BRP koppeling.',
      codePath: 'app/linkuser',
      table: this.sessionsTable,
      tablePermissions: 'ReadWrite',
      applicationUrlBase: baseUrl,
      environment: {
        MTLS_PRIVATE_KEY_ARN: secretMTLSPrivateKey.secretArn,
        MTLS_CLIENT_CERT_NAME: Statics.ssmMTLSClientCert,
        MTLS_ROOT_CA_NAME: Statics.ssmMTLSRootCA,
        BRP_API_URL: SSM.StringParameter.valueForStringParameter(this, Statics.ssmBrpApiEndpointUrl),
        CLIENT_SECRET_ARN: oidcSecret.secretArn,
      },
    });
    secretMTLSPrivateKey.grantRead(linkUserFunction.lambda);
    tlskeyParam.grantRead(linkUserFunction.lambda);
    tlsRootCAParam.grantRead(linkUserFunction.lambda);
    oidcSecret.grantRead(linkUserFunction.lambda);


    this.api.addRoutes({
      integration: new HttpLambdaIntegration('login', loginFunction.lambda),
      path: '/login',
      methods: [HttpMethod.GET],
    });

    this.api.addRoutes({
      integration: new HttpLambdaIntegration('logout', logoutFunction.lambda),
      path: '/logout',
      methods: [HttpMethod.GET],
    });

    this.api.addRoutes({
      integration: new HttpLambdaIntegration('auth', authFunction.lambda),
      path: '/auth',
      methods: [HttpMethod.GET],
    });

    this.api.addRoutes({
      integration: new HttpLambdaIntegration('home', homeFunction.lambda),
      path: '/',
      methods: [HttpMethod.GET, HttpMethod.POST],
    });

    this.api.addRoutes({
      integration: new HttpLambdaIntegration('home', linkUserFunction.lambda),
      path: '/linkuser',
      methods: [HttpMethod.POST],
    });
  }

  /**
   * Clean and return the apigateway subdomain placeholder
   * https://${Token[TOKEN.246]}.execute-api.eu-west-1.${Token[AWS.URLSuffix.3]}/
   * which can't be parsed by the URL class.
   *
   * @returns a domain-like string cleaned of protocol and trailing slash
   */
  domain(): string {
    const url = this.api.url;
    if (!url) { return ''; }
    let cleanedUrl = url
      .replace(/^https?:\/\//, '') //protocol
      .replace(/\/$/, ''); //optional trailing slash
    return cleanedUrl;
  }
}
