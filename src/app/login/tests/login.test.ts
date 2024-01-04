import { handler } from '../login.lambda';
import { handleLoginRequest } from '../loginRequestHandler';
import { DynamoDBClient, GetItemCommandOutput, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBClient);

beforeAll(() => {
  if (process.env.VERBOSETESTS != 'True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
  }

  // Set env variables
  process.env.SESSION_TABLE = 'mijnuitkering-sessions';
  process.env.AUTH_URL_BASE = 'https://authenticatie-accp.nijmegen.nl';
  process.env.APPLICATION_URL_BASE = 'https://testing.example.com/';
  process.env.OIDC_SECRET_ARN = '123';
  process.env.OIDC_CLIENT_ID = '1234';
  process.env.OIDC_SCOPE = 'openid';
});


beforeEach(() => {
  ddbMock.reset();
});

test('index is ok', async () => {
  const result = await handler({}, {});
  expect(result.statusCode).toBe(400);
});

test('Return login page with correct link', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const result = await handleLoginRequest({ cookies: '', contact_id: 'test' }, dynamoDBClient);
  expect(result.headers?.Location).toContain(process.env.AUTH_URL_BASE);
  expect(result.statusCode).toBe(302);
});

test('Redirect to auth url if session cookie doesn\'t exist', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });

  const result = await handleLoginRequest({ cookies: 'demo=12345', contact_id: 'test' }, dynamoDBClient);
  expect(result.statusCode).toBe(302);
  expect(result.headers?.Location).toContain(process.env.AUTH_URL_BASE);
});

test('Create session if no session exists', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });

  await handleLoginRequest({ contact_id: 'test' }, dynamoDBClient);

  expect(ddbMock.calls().length).toBe(1);
});

test('Redirect to home if already logged in', async () => {
  const output: Partial<GetItemCommandOutput> = {
    Item: {
      data: {
        M: {
          loggedin: {
            BOOL: true,
          },
        },
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(output);
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const sessionId = '12345';
  const result = await handleLoginRequest({ cookies: `session=${sessionId}`, contact_id: 'test' }, dynamoDBClient);
  expect(result.headers?.Location).toBe('/');
  expect(result.statusCode).toBe(302);
});

test('Error if no contact-id', async () => {

  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const sessionId = '12345';
  const result = await handleLoginRequest({ cookies: `session=${sessionId}` }, dynamoDBClient);
  expect(result.statusCode).toBe(400);
});

test('Unknown session returns login page', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const output: Partial<GetItemCommandOutput> = {}; //empty output
  ddbMock.on(GetItemCommand).resolves(output);
  const sessionId = '12345';
  const result = await handleLoginRequest({ cookies: `session=${sessionId}`, contact_id: 'test' }, dynamoDBClient);
  expect(ddbMock.calls().length).toBe(2);
  expect(result.statusCode).toBe(302);
  expect(result.headers?.Location).toContain(process.env.AUTH_URL_BASE);
});

test('Known session without login redirects to login url, without creating new session', async () => {
  const output: Partial<GetItemCommandOutput> = {
    Item: {
      loggedin: {
        BOOL: false,
      },
    },
  };
  ddbMock.on(GetItemCommand).resolves(output);
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const sessionId = '12345';
  const result = await handleLoginRequest({ cookies: `session=${sessionId}`, contact_id: 'test' }, dynamoDBClient);
  expect(ddbMock.calls().length).toBe(2);
  expect(result.statusCode).toBe(302);
  expect(result.headers?.Location).toContain(process.env.AUTH_URL_BASE);
});

test('Request without session returns session cookie', async () => {
  const dynamoDBClient = new DynamoDBClient({ region: 'eu-west-1' });
  const result = await handleLoginRequest({ cookies: '', contact_id: 'test' }, dynamoDBClient);
  expect(result.cookies).toEqual(
    expect.arrayContaining([expect.stringMatching('session=')]),
  );
});