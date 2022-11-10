import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { OpenIDConnect } from './shared/OpenIDConnect';

export async function handleRequest(cookies: any, queryStringParamCode: string, queryStringParamState: string, dynamoDBClient: any): Promise<any> {
  let session = new Session(cookies, dynamoDBClient, { ttlInMinutes: 240 });
  await session.init();
  if (session.sessionId === false) {
    return Response.redirect('/login');
  }
  const state = session.getValue('state');
  const contact_id = session.getValue('contact_id');
  const OIDC = new OpenIDConnect();
  try {
    const tokenSet = await OIDC.authorize(queryStringParamCode, state, queryStringParamState);
    if (tokenSet) {
      const expires_at = Date.now() + tokenSet.expires_in * 1000; // Seconds to millis
      await session.createSession({
        loggedin: { BOOL: true },
        access_token: { S: tokenSet.access_token },
        refresh_token: { S: tokenSet.refresh_token },
        expires_at: { N: `${expires_at}` },
        xsrf_token: { S: OIDC.generateState() },
      });
    } else {
      return Response.error(500);
    }
  } catch (error: any) {
    console.debug('test2', error);
    console.error(error.message);
    return Response.redirect('/login');
  }
  const url = contact_id ? `/?contact_id=${contact_id}` : '/';
  return Response.redirect(url, 302, [session.getCookie()]);
}