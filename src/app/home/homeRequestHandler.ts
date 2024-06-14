import { Response } from '@gemeentenijmegen/apigateway-http/lib/V2/Response';
import { Session } from '@gemeentenijmegen/session';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { BrpApi } from './BrpApi';
import * as controle_form from './templates/controle_form.mustache';
import * as homeTemplate from './templates/home.mustache';
import { OpenIDConnect } from '../shared/OpenIDConnect';
import { render } from '../shared/render';

export class Home {
  private params: any;
  private apiClient: any;
  private dynamoDBClient: any;
  private session?: Session;
  private oidcClient?: OpenIDConnect;
  constructor(params: any, apiClient: any, dynamoDBClient: any, oidcClient?: any) {
    this.params = params;
    this.apiClient = apiClient;
    this.dynamoDBClient = dynamoDBClient;
    this.oidcClient = oidcClient;
  }

  async handleRequest(): Promise<any> {
    if (!this.params.contact_id) { return Response.error(400); }
    this.session = new Session(this.params.cookies, this.dynamoDBClient, { ttlInMinutes: 240 });
    await this.session.init();
    if (this.session.isLoggedIn() == true) {
      if (!this.is_valid_post()) {
        return Response.error(403);
      };
      await this.refreshSessionIfExpired(this.session);
      return this.loggedInResponse();
    }
    return Response.redirect(`/login?contact_id=${this.params.contact_id}`);
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
        const providedBsnString = this.params.body.bsn.replace(/\D/g, ''); //strip all nonnumeric characters
        const bsnValidationResult = Bsn.validate(providedBsnString);
        if (!bsnValidationResult.success) {
          data.error = `Geen geldig bsn opgegeven: ${bsnValidationResult.message}`;
        } else {
          const bsn = new Bsn(providedBsnString);
          data.controle_data = await this.brpData(bsn);
          data.bsn = bsn.bsn;
        }
      } catch (error) {
        data.error = 'Er is iets misgegaan, probeer het opnieuw.';
        console.error(error);
      }
    }
    // render page
    if (this.params.accepts == 'application/json') {
      const html = await render(data, controle_form.default);
      data.html = html;
      return Response.json(data, 200, this.session?.getCookie());
    } else {
      const html = await render(data, homeTemplate.default, {
        controle_form: controle_form.default,
      });
      return Response.html(html, 200, this.session?.getCookie());
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
      error: brpData?.error,
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
      if (!this.oidcClient) {
        this.oidcClient = new OpenIDConnect();
      }
      const refreshToken = session.getValue('refresh_token');
      const expiresAt = session.getValue('expires_at');
      if (expiresAt > Date.now()) {
        return;
      }
      const tokenSet = await this.oidcClient.refresh(refreshToken);
      if (tokenSet) {
        const expires_at = Date.now() + (tokenSet.expires_in ?? 60) * 1000; // Seconds to millis
        await session.updateSession({
          loggedin: { BOOL: true },
          access_token: { S: tokenSet.access_token },
          refresh_token: { S: tokenSet.refresh_token },
          expires_at: { N: `${expires_at}` },
          xsrf_token: { S: this.oidcClient.generateState() },
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
}

export async function homeRequestHandler(params: any, apiClient: any, dynamoDBClient: any): Promise<any> {
  const home = new Home(params, apiClient, dynamoDBClient);
  return home.handleRequest();
}
