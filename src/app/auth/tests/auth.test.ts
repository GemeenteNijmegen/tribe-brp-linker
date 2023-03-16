import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommandOutput, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { handleRequest } from '../handleRequest';
import { OpenIDConnect } from '../shared/OpenIDConnect';

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

  const output: GetSecretValueCommandOutput = {
    $metadata: {},
    SecretString: 'ditiseennepgeheim',
  };
  secretsMock.on(GetSecretValueCommand).resolves(output);
});

jest.mock('../shared/OpenIDConnect', () => ({
  ...jest.requireActual('../shared/OpenIDConnect'),
  getOidcClientSecret: async () => {
    return 123;
  },
  authorize: () => {
    console.debug('aegaeghea');
    return {
      aud: process.env.OIDC_CLIENT_ID,
      sub: '900222670',
      acr: 'urn:oasis:names:tc:SAML:2.0:ac:classes:MobileTwoFactorContract',
    };
  }
}));

const ddbMock = mockClient(DynamoDBClient);
const secretsMock = mockClient(SecretsManagerClient);

beforeEach(() => {
  ddbMock.reset();
});

test('Successful auth redirects to home', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const sessionId = '12345';
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
  const oidc = mockedOidcClient();
  const result = await handleRequest(`session=${sessionId}`, 'state', '12345', dynamoDBClient, oidc);
  expect(result.statusCode).toBe(302);
  expect(result.headers.Location).toBe('/');
});


test('Successful auth creates new session', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const sessionId = '12345';
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: false },
          state: { S: '12345' },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(getItemOutput);


  const oidc = mockedOidcClient();
  const result = await handleRequest(`session=${sessionId}`, 'state', '12345', dynamoDBClient, oidc);
  expect(result.statusCode).toBe(302);
  expect(result.headers.Location).toBe('/');
  expect(result.cookies).toContainEqual(expect.stringContaining('session='));
});

test('No session redirects to login', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const result = await handleRequest('', 'state', 'state', dynamoDBClient);
  expect(result.statusCode).toBe(302);
  expect(result.headers.Location).toBe('/login');
});

function mockedOidcClient() {
  const oidc = new OpenIDConnect();
  oidc.getOidcClientSecret = async () => '123';
  oidc.authorize = async () => {
    return {
      aud: process.env.OIDC_CLIENT_ID,
      sub: '900222670',
      acr: 'urn:oasis:names:tc:SAML:2.0:ac:classes:MobileTwoFactorContract',
    };
  };
  return oidc;
}
