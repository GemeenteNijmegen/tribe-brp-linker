import { Session } from '@gemeentenijmegen/session';
import { OpenIDConnect } from './shared/OpenIDConnect';

function redirectResponse(location: string, code = 302, cookies?: string[]) {
  return {
    statusCode: code,
    body: '',
    headers: {
      Location: location,
    },
    cookies: cookies,
  };
}

export async function handleRequest(cookies: any, queryStringParamCode: string, queryStringParamState: string, dynamoDBClient: any): Promise<any> {
  let session = new Session(cookies, dynamoDBClient, { ttlInMinutes: 240 });
  await session.init();
  if (session.sessionId === false) {
    return redirectResponse('/login');
  }
  const state = session.getValue('state');
  const contact_id = session.getValue('contact_id');
  const OIDC = new OpenIDConnect();
  try {
    const tokenSet = await OIDC.authorize(queryStringParamCode, state, queryStringParamState);
    if (tokenSet) {
      await session.createSession({
        loggedin: { BOOL: true },
        access_token: { S: tokenSet.access_token },
        refresh_token: { S: tokenSet.refresh_token },
        expires_at: { N: tokenSet.expires_at },
        xsrf_token: { S: OIDC.generateState() },
      });
    } else {
      return { statusCode: 500 };
    }
  } catch (error: any) {
    console.debug('test2', error);
    console.error(error.message);
    return redirectResponse('/login');
  }
  const url = contact_id ? `/?contact_id=${contact_id}` : '/';
  return redirectResponse(url, 302, [session.getCookie()]);
}