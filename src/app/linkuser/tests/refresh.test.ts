import { DynamoDBClient, GetItemCommand, GetItemCommandOutput } from '@aws-sdk/client-dynamodb';
import { Session } from '@gemeentenijmegen/session';
import { mockClient } from 'aws-sdk-client-mock';
import { LinkUser } from '../LinkUser';
import { OpenIDConnect } from '../OpenIDConnect';

const ddbMock = mockClient(DynamoDBClient);

beforeEach(() => {
  ddbMock.reset();
});

test('refresh token gets generated', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const { refreshedExpiry, secondRefreshToken } = returnExpiredAndThenValidSessionOutput();

  const linkUser = new LinkUser({}, null, null, mockedOidcClient());
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
  returnValidSessionOutput();
  const linkUser = new LinkUser({}, null, null, mockedOidcClient());
  const session = new Session('session=12345;', dynamoDBClient);
  await session.init();
  const result = await linkUser.refreshSessionIfExpired(session);
  expect(result).toBe(false);
});


function returnExpiredAndThenValidSessionOutput() {
  const getItemOutput: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: { BOOL: true },
          access_token: { S: 'access' },
          refresh_token: { S: 'refresh' },
          expires_at: { N: '2000' },
        },
      },
    },
  };
  const secondRefreshToken = 'refresh2';
  const refreshedExpiry = '4000';
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
  return { refreshedExpiry, secondRefreshToken };
}

function returnValidSessionOutput() {
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
}

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
  oidc.refresh = jest.fn(() => Promise.resolve({
    access_token: 'bla',
    refresh_token: 'die',
    expires_in: 86400,
    expired: () => false,
    claims: jest.fn(),
  }));
  return oidc;
}
