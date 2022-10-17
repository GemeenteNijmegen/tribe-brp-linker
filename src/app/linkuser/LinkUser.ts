import { Session } from '@gemeentenijmegen/session';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { BrpApi } from './BrpApi';
import { OpenIDConnect } from './OpenIDConnect';
import { TribeApi } from './TribeApi';
import { TribeUser } from './TribeUser';

export class LinkUser {
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
    if (!this.params.body.contact_id) { return this.errorResponse(400); }
    this.session = new Session(this.params.cookies, this.dynamoDBClient, { ttlInMinutes: 240 });
    await this.session.init();
    if (this.session.isLoggedIn() == true) {
      await this.refreshSession(this.session);
      return this.loggedInResponse();
    }
    return this.redirectResponse(`/login?contact_id=${this.params.contact_id}`);
  }

  async loggedInResponse() {
    if (!this.session) {
      console.error('No active session');
      return this.errorResponse();
    }
    try {
      console.debug('handling link request: getting data');
      const bsn = new Bsn(this.params.body.bsn);
      const brpData = await this.brpData(bsn);
      console.debug('handling link request: retrieved data');
      const tribeApi = new TribeApi(this.session.getValue('access_token'));
      const tribeUser = new TribeUser(bsn, tribeApi);
      const exists = await tribeUser.exists();
      if (!exists) {
        await tribeUser.create({
          FirstName: brpData.firstName,
          LastName: brpData.lastName,
          MiddleName: brpData.middleName,
        });
      } else {
        await tribeUser.update({
          FirstName: brpData.firstName,
          LastName: brpData.lastName,
          MiddleName: brpData.middleName,
        });
      }
      if (await tribeUser.hasAddress()) {
        await tribeUser.updateAddress({
          Street: brpData.street,
          HouseNumber: brpData.number,
          HouseNumberSuffix: brpData.suffix,
          City: brpData.city,
          Postalcode: brpData.postalCode,
        });
      } else {
        await tribeUser.createAddress({
          Street: brpData.street,
          HouseNumber: brpData.number,
          HouseNumberSuffix: brpData.suffix,
          City: brpData.city,
          Postalcode: brpData.postalCode,
        });
      }
      await tribeUser.addToContactMoment(this.params.body.contact_id);
      return this.redirectResponse(`https://app.tribecrm.nl/entity/${this.params.body.contact_id}`);
    } catch (error) {
      console.error(error);
      return this.errorResponse();
    }
  }

  async brpData(bsn: Bsn) {
    const brpApi = new BrpApi(this.apiClient);
    const brpData = await brpApi.getBrpData(bsn.bsn);
    const splitNumber = brpApi.houseNumberHelper(brpData?.Persoon?.Adres?.Huisnummer);
    const data = {
      birthday: brpData?.Persoon?.Persoonsgegevens?.Geboortedatum,
      firstName: brpData?.Persoon?.Persoonsgegevens?.Voornamen,
      lastName: brpData?.Persoon?.Persoonsgegevens?.Achternaam,
      middleName: brpData?.Persoon?.Persoonsgegevens?.Voorvoegsel,
      city: brpData?.Persoon?.Adres?.Woonplaats,
      street: brpData?.Persoon?.Adres?.Straat,
      number: splitNumber.number,
      suffix: splitNumber.suffix,
      postalCode: brpData?.Persoon?.Adres?.Postcode,
    };
    return data;
  }

  /**
   * Uses the refresh token to refresh the session
   * Stores the new acces/refresh tokens and expiration
   * Also refreshes the xsrf token.
   * @param session The active session
   */
  async refreshSession(session: Session) {
    try {
      const OIDC = new OpenIDConnect();
      const refreshToken = session.getValue('refresh_token');
      const expiresIn = session.getValue('expires_in');
      const lastRefresh = session.getValue('last_refresh');
      const sessionStart = session.getValue('session_start');
      const maxSession = session.ttl * 60 * 1000; // Convert to milis
      const tokenSet = await OIDC.refresh(refreshToken, lastRefresh, expiresIn, sessionStart, maxSession);
      if (tokenSet === false) {
        return; // No refresh needed
      } else if (tokenSet) {
        await session.updateSession({
          loggedin: { BOOL: true },
          access_token: { S: tokenSet.access_token },
          refresh_token: { S: tokenSet.refresh_token },
          expires_in: { N: `${tokenSet.expires_in}` },
          last_refresh: { N: Date.now() },
          xsrf_token: { S: OIDC.generateState() },
          // Do not refresh session_start (denoting start of session)
        });
      } else {
        throw Error('Could not refresh session');
      }
    } catch (error: any) {
      console.error(error.message);
      // Do not rethrow error as this is no critical functionality
    }
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

  errorResponse(code = 500) {
    return {
      statusCode: code,
    };
  }
}