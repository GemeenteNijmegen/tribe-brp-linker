import { OpenIDConnect } from '../shared/OpenIDConnect';
import { ApiGatewayV2Response, Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';

export async function handleLoginRequest(params: any, dynamoDBClient: any): Promise<ApiGatewayV2Response> {
  if (!params.contact_id) { return Response.error(400); }
  let session = new Session(params.cookies, dynamoDBClient);
  await session.init();
  if (session.isLoggedIn() === true) {
    console.debug('redirect to home');
    return Response.redirect('/');
  }
  let OIDC = new OpenIDConnect();
  const state = OIDC.generateState();
  await session.createSession({
    loggedin: { BOOL: false },
    state: { S: state },
    contact_id: { S: params.contact_id },
  });
  const authUrl = OIDC.getLoginUrl(state);

  const newCookies = [session.getCookie()];
  return Response.redirect(authUrl, 302, newCookies);
}
