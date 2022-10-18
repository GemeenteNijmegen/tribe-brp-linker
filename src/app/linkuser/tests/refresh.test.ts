import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient, GetSecretValueCommandOutput, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { LinkUser } from '../LinkUser';
import { Session } from '@gemeentenijmegen/session';
beforeAll(() => {

  // if (process.env.VERBOSETESTS!='True') {
  //   global.console.error = jest.fn();
  //   global.console.time = jest.fn();
  //   global.console.log = jest.fn();
  // }

  // // Set env variables
  // process.env.SESSION_TABLE = 'mijnuitkering-sessions';
  // process.env.AUTH_URL_BASE = 'https://authenticatie-accp.nijmegen.nl';
  process.env.APPLICATION_URL_BASE = 'https://testing.example.com/';
  // process.env.CLIENT_SECRET_ARN = '123';
  process.env.OIDC_CLIENT_ID = '1234';
  // process.env.OIDC_SCOPE = 'openid';

  const output: GetSecretValueCommandOutput = {
    $metadata: {},
    SecretString: 'ditiseennepgeheim',
  };
  secretsMock.on(GetSecretValueCommand).resolves(output);

});

jest.mock('openid-client', () => {
  const originalClient = jest.requireActual('openid-client');
  return {
    ...originalClient,
    Issuer: jest.fn(() => {
      return {
        Client: jest.fn(() => {
          return {
            oauthCallback: jest.fn(() => {
              return {
                access_token: 'bla',
                refresh_token: 'die',
                expires: 1234,
              };
            }),
            callbackParams: jest.fn(() => {}),
            refresh: jest.fn(() => {
              return {
                access_token: 'bla',
                refresh_token: 'die',
                expires_in: 86400,
              };
            }),
          };
        }),
        ...originalClient.issuer,
      };
    }),
  };
});

const ddbMock = mockClient(DynamoDBClient);
const secretsMock = mockClient(SecretsManagerClient);

beforeEach(() => {
  ddbMock.reset();
});

test('refresh token gets generated', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  // const sessionId = '12345';
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          access_token: { S: 'access' },
          refresh_token: { S: 'refresh' },
          expires_at: { N: "2000" },
        },
      },
    },
  };
  const secondRefreshToken = 'refresh2';
  const refreshedExpiry = "4000";
  const getItemOutputSecond: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          access_token: { S: 'access' },
          refresh_token: { S: secondRefreshToken },
          expires_at: { N: refreshedExpiry },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand)
    .resolvesOnce(getItemOutput)
    .resolvesOnce(getItemOutputSecond);

  const linkUser = new LinkUser({}, null, null);
  const session = new Session('session=12345;', dynamoDBClient);
  await session.init();
  const result = await linkUser.refreshSessionIfExpired(session);

  //new session for now (updateSession doesn't update the session var)
  const session2 = new Session('session=12345;', dynamoDBClient);
  await session2.init();
  expect(session2.getValue('expires_at', 'N')).toBe(refreshedExpiry);
  expect(session2.getValue('refresh_token')).toBe(secondRefreshToken);
  expect(result).toBe(true);
});


test('Not expired: No new token', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  // const sessionId = '12345';
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          access_token: { S: 'access' },
          refresh_token: { S: 'refresh' },
          expires_at: { N: (Date.now() + 10 * 1000).toString() },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(getItemOutput);
  const linkUser = new LinkUser({}, null, null);
  const session = new Session('session=12345;', dynamoDBClient);
  await session.init();
  const result = await linkUser.refreshSessionIfExpired(session);
  expect(result).toBe(false);
});