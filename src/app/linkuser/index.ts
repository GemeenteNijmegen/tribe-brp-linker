import { parse } from 'querystring';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { ApiClient } from '@gemeentenijmegen/apiclient';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { LinkUser } from './LinkUser';

const dynamoDBClient = new DynamoDBClient({});
const apiClient = new ApiClient();

async function init() {
  console.time('init');
  console.timeLog('init', 'start init');
  let promise = apiClient.init();
  console.timeEnd('init');
  return promise;
}

const initPromise = init();

function parseEvent(event: APIGatewayProxyEventV2): any {
  const body = event.body ? parse(Buffer.from(event.body, 'base64').toString('utf8')) : undefined;
  return {
    cookies: event?.cookies?.join(';'),
    body,
    method: event.requestContext.http.method,
    contact_id: event?.queryStringParameters?.contact_id ? event?.queryStringParameters?.contact_id : body?.contact_id,
  };
}

exports.handler = async (event: any, _context: any) => {
  try {
    const params = parseEvent(event);
    await initPromise;
    console.debug(params);
    const linkUser = new LinkUser(params, apiClient, dynamoDBClient);
    return await linkUser.handleRequest();

  } catch (err) {
    console.error(err);
    const response = {
      statusCode: 500,
    };
    return response;
  }
};