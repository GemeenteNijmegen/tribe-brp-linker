import { handleRequest } from './handleRequest';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';

const dynamoDBClient = new DynamoDBClient({});

function parseEvent(event: any) {
  return {
    cookies: event?.cookies?.join(';'),
    code: event?.queryStringParameters?.code,
    state: event?.queryStringParameters?.state,
  };
}

exports.handler = async (event: any, _context: any) => {
  try {
    console.log(event);
    const params = parseEvent(event);
    return await handleRequest(params.cookies, params.code, params.state, dynamoDBClient);
  } catch (err) {
    console.error(err);
    return Response.error(500);
  }
};