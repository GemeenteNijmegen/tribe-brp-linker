import { Session } from '@gemeentenijmegen/session';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
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
      return this.loggedInResponse();
    }
    return this.redirectResponse(`/login?contact_id=${this.params.contact_id}`);
  }

  async loggedInResponse() {
    let data: any = {
      title: 'Controleer BRP-gegevens',
      shownav: true,
      contact_id: this.params.contact_id,
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
    const html = await render(data, __dirname + '/templates/home.mustache', {
      header: `${__dirname}/shared/header.mustache`,
      footer: `${__dirname}/shared/footer.mustache`,
    });

    return this.htmlResponse(html);
  }

  async brpData(bsn: Bsn) {
    const brpApi = new BrpApi(this.apiClient);
    const brpData = await brpApi.getBrpData(bsn.bsn);
    const data = {
      birthday: brpData?.Persoon?.Persoonsgegevens?.Geboortedatum,
      lastname: brpData?.Persoon?.Persoonsgegevens?.Achternaam,
      city: brpData?.Persoon?.Adres?.Woonplaats,
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
