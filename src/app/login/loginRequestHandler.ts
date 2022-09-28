import { Session } from '@gemeentenijmegen/session';
import { OpenIDConnect } from './shared/OpenIDConnect';

function redirectResponse(location: string, status = 302, cookies?: any[]) {
  const response = {
    statusCode: status,
    headers: {
      Location: location,
    },
    cookies: cookies,
  };
  return response;
}

export async function handleLoginRequest(params: any, dynamoDBClient: any) {
  let session = new Session(params.cookies, dynamoDBClient);
  await session.init();
  if (session.isLoggedIn() === true) {
    console.debug('redirect to home');
    return redirectResponse('/');
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
  return redirectResponse(authUrl, 302, newCookies);
}
