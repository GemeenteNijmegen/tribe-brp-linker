import { Session } from '@gemeentenijmegen/session';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { BrpApi } from './BrpApi';
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
    if(!this.params.body.contact_id) { return this.errorResponse(400); }
    this.session = new Session(this.params.cookies, this.dynamoDBClient);
    await this.session.init();
    if (this.session.isLoggedIn() == true) {
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