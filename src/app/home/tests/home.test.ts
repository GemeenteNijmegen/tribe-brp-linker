import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommandOutput, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { FileApiClient } from '../FileApiClient';
import { homeRequestHandler } from '../homeRequestHandler';

beforeAll(() => {

  if (process.env.VERBOSETESTS!='True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
  }
  // Set env variables
  process.env.SESSION_TABLE = 'mijnuitkering-sessions';
  process.env.AUTH_URL_BASE = 'https://authenticatie-accp.nijmegen.nl';
  process.env.APPLICATION_URL_BASE = 'https://testing.example.com/';
  process.env.CLIENT_SECRET_ARN = '123';
  process.env.OIDC_CLIENT_ID = '1234';
  process.env.OIDC_SCOPE = 'openid';
});


const ddbMock = mockClient(DynamoDBClient);
const secretsMock = mockClient(SecretsManagerClient);

beforeEach(() => {
  ddbMock.reset();
  secretsMock.reset();
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          bsn: { S: '12345678' },
          state: { S: '12345' },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(getItemOutput);
});

describe('Requests to home route', () => {
  test('Returns 200 when logged in', async () => {
    const output: GetSecretValueCommandOutput = {
      $metadata: {},
      SecretString: 'ditiseennepgeheim',
    };
    secretsMock.on(GetSecretValueCommand).resolves(output);
    const apiClient = new FileApiClient();
    const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
    const result = await homeRequestHandler({ cookies: 'session=12345', contact_id: 'test' }, apiClient, dynamoDBClient);

    expect(result.statusCode).toBe(200);
    let cookies = result.cookies.filter((cookie: string) => cookie.indexOf('HttpOnly; Secure'));
    expect(cookies.length).toBe(1);
  });

  test('Returns 400 when no contact id is provided', async () => {
    const output: GetSecretValueCommandOutput = {
      $metadata: {},
      SecretString: 'ditiseennepgeheim',
    };
    secretsMock.on(GetSecretValueCommand).resolves(output);
    const apiClient = new FileApiClient();
    const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
    const result = await homeRequestHandler({ cookies: 'session=12345' }, apiClient, dynamoDBClient);

    expect(result.statusCode).toBe(400);
  });

  test('Shows overview page', async () => {
    const output: GetSecretValueCommandOutput = {
      $metadata: {},
      SecretString: 'ditiseennepgeheim',
    };
    secretsMock.on(GetSecretValueCommand).resolves(output);
    const apiClient = new FileApiClient();
    const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
    const result = await homeRequestHandler({ cookies: 'session=12345', contact_id: 'test' }, apiClient, dynamoDBClient);
    expect(result.body).toMatch('BRP');
  });


  test('After sending form details are shown', async () => {
    const output: GetSecretValueCommandOutput = {
      $metadata: {},
      SecretString: 'ditiseennepgeheim',
    };
    secretsMock.on(GetSecretValueCommand).resolves(output);
    const apiClient = new FileApiClient();
    const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
    const result = await homeRequestHandler({
      method: 'POST',
      cookies: 'session=12345',
      contact_id: 'test',
      body: { bsn: '900222670' },
    }, apiClient, dynamoDBClient);
    expect(result.body).toMatch('Geboortedatum');
  });
});