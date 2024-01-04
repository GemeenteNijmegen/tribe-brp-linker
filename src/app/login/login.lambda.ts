import { handleLoginRequest } from './loginRequestHandler';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';

const dynamoDBClient = new DynamoDBClient({});

function parseEvent(event: any) {
  return {
    cookies: event?.cookies?.join(';'),
    contact_id: event?.queryStringParameters?.contact_id,
  };
}

export async function handler(event: any, _context: any) {
  try {
    const params = parseEvent(event);
    const response = await handleLoginRequest(params, dynamoDBClient);
    return response;
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
};