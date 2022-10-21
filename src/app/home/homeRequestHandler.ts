import { Session } from '@gemeentenijmegen/session';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { OpenIDConnect } from '../auth/shared/OpenIDConnect';
import { BrpApi } from './BrpApi';
import { render } from './shared/render';

class Home {
  private params: any;
  private apiClient: any;
  private dynamoDBClient: any;
  private session?: Session;
  constructor(params: any, apiClient: any, dynamoDBClient: any) {
    this.params = params;
    this.apiClient = apiClient;
    this.dynamoDBClient = dynamoDBClient;
  }

  async handleRequest(): Promise<any> {
    if (!this.params.contact_id) { return this.errorResponse(400); }
    this.session = new Session(this.params.cookies, this.dynamoDBClient, { ttlInMinutes: 240 });
    await this.session.init();
    if (this.session.isLoggedIn() == true) {
      if (!this.is_valid_post()) {
        return this.errorResponse(403);
      };
      await this.refreshSessionIfExpired(this.session);
      return this.loggedInResponse();
    }
    return this.redirectResponse(`/login?contact_id=${this.params.contact_id}`);
  }

  async loggedInResponse() {
    const xsrf_token = this.session?.getValue('xsrf_token');
    let data: any = {
      title: 'Controleer BRP-gegevens',
      shownav: true,
      contact_id: this.params.contact_id,
      xsrf_token,
    };

    if (this.params.method == 'POST') {
      try {
        const bsn = new Bsn(this.params.body.bsn);
        data.controle_data = await this.brpData(bsn);
        data.bsn = bsn.bsn;
      } catch (error) {
        data.error = 'Er is iets misgegaan, probeer het opnieuw';
        console.error(error);
      }
    }
    // render page
    if (this.params.accepts == 'application/json') {
      const html = await render(data, __dirname + '/templates/controle_form.mustache', {});
      data.html = html;
      return this.jsonResponse(data);
    } else {
      const html = await render(data, __dirname + '/templates/home.mustache', {
        header: `${__dirname}/shared/header.mustache`,
        footer: `${__dirname}/shared/footer.mustache`,
        controle_form: `${__dirname}/templates/controle_form.mustache`,
      });
      return this.htmlResponse(html);
    }
  }

  async brpData(bsn: Bsn) {
    const brpApi = new BrpApi(this.apiClient);
    const brpData = await brpApi.getBrpData(bsn.bsn);
    const data = {
      birthday: brpData?.Persoon?.Persoonsgegevens?.Geboortedatum,
      name: brpData?.Persoon?.Persoonsgegevens?.Naam,
      postcode: brpData?.Persoon?.Adres?.Postcode,
      huisnummer: brpData?.Persoon?.Adres?.Huisnummer,
      isNijmegen: brpData?.Persoon?.Adres?.Gemeente == 'Nijmegen',
    };
    return data;
  }

  /**
   * Uses the refresh token to refresh the session
   * Stores the new acces/refresh tokens and expiration
   * Also refreshes the xsrf token.
   * @param session The active session
   */
  async refreshSessionIfExpired(session: Session) {
    try {
      const OIDC = new OpenIDConnect();
      const refreshToken = session.getValue('refresh_token');
      const expiresAt = session.getValue('expires_at');
      if (expiresAt > Date.now()) {
        return;
      }
      const tokenSet = await OIDC.refresh(refreshToken);
      if (tokenSet) {
        const expires_at = Date.now() + (tokenSet.expires_in ?? 60) * 1000; // Seconds to millis
        await session.updateSession({
          loggedin: { BOOL: true },
          access_token: { S: tokenSet.access_token },
          refresh_token: { S: tokenSet.refresh_token },
          expires_at: { N: `${expires_at}` },
          xsrf_token: { S: OIDC.generateState() },
        });
      } else {
        throw Error('Could not refresh session');
      }
    } catch (error: any) {
      console.error(error.message);
      // Do not rethrow error as this is no critical functionality
    }
  }

  /**
   * Check if the request is a valid post. For now only checks XSRF token.
   *
   * @returns boolean
   */
  is_valid_post() {
    if (this.params.method != 'POST') {
      return true;
    }
    const xsrf_token = this.session?.getValue('xsrf_token');
    const invalid_xsrf_token = xsrf_token == undefined || xsrf_token !== this.params.body.xsrf_token;
    if (invalid_xsrf_token) {
      console.debug('xsrf tokens do not match');
      return false;
    }
    return true;
  }

  redirectResponse(location: string, code = 302) {
    return {
      statusCode: code,
      body: '',
      headers: {
        Location: location,
      },
    };
  }

  htmlResponse(body: string) {
    return {
      statusCode: 200,
      body,
      headers: {
        'Content-type': 'text/html',
      },
      cookies: [
        this.session?.getCookie(),
      ],
    };
  }

  jsonResponse(body: object) {
    return {
      statusCode: 200,
      body: JSON.stringify(body),
      headers: {
        'Content-type': 'application/json',
      },
      cookies: [
        this.session?.getCookie(),
      ],
    };
  }

  errorResponse(code = 500) {
    return {
      statusCode: code,
    };
  }
}

export async function homeRequestHandler(params: any, apiClient: any, dynamoDBClient: any): Promise<any> {
  const home = new Home(params, apiClient, dynamoDBClient);
  return home.handleRequest();
}