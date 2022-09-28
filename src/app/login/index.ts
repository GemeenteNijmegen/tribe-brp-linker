import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { handleLoginRequest } from './loginRequestHandler';

const dynamoDBClient = new DynamoDBClient({});

function parseEvent(event: any) {
  return {
    cookies: event?.cookies?.join(';'),
    contact_id: event?.queryStringParameters?.contact_id,
  };
}

exports.handler = async (event: any, _context: any) => {
  try {
    const params = parseEvent(event);
    const response = await handleLoginRequest(params, dynamoDBClient);
    return response;
  } catch (err) {
    console.error(err);
    const response = {
      statusCode: 500,
    };
    return response;
  }
};