import { render } from '../shared/render';
import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import cookie from 'cookie';

export async function handleLogoutRequest(cookies:string, dynamoDBClient: any) {
  let session = new Session(cookies, dynamoDBClient);
  if (await session.init()) {
    await session.updateSession({
      loggedin: { BOOL: false },
    });
  }

  const html = await render({ title: 'Uitgelogd' }, __dirname + '/templates/logout.mustache');
  const emptyCookie = cookie.serialize('session', '', {
    httpOnly: true,
    secure: true,
  });
  return Response.html(html, 200, [emptyCookie]);
}
