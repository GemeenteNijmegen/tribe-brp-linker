import { Session } from '@gemeentenijmegen/session';
import { render } from './shared/render';

function redirectResponse(location: string, code = 302) {
  return {
    statusCode: code,
    body: '',
    headers: {
      Location: location,
    },
  };
}

export async function homeRequestHandler(params: any, apiClient: any, dynamoDBClient: any): Promise<any> {
  let session = new Session(params.cookies, dynamoDBClient);
  await session.init();
  if (session.isLoggedIn() == true) {
    return handleLoggedinRequest(session, apiClient, params.contact_id);
  }
  return redirectResponse(`/login?contact_id=${params.contact_id}`);
}

async function handleLoggedinRequest(session: any, _apiClient: any, _contact_id: string) {
  // const bsn = session.getValue('bsn');
  const data = {
    title: 'overzicht',
    shownav: true,
  };

  // render page
  const html = await render(data, __dirname + '/templates/home.mustache', {
    header: `${__dirname}/shared/header.mustache`,
    footer: `${__dirname}/shared/footer.mustache`,
  });
  const response = {
    statusCode: 200,
    body: html,
    headers: {
      'Content-type': 'text/html',
    },
    cookies: [
      session.getCookie(),
    ],
  };
  return response;
}

