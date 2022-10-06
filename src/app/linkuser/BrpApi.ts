import { ApiClient } from '@gemeentenijmegen/apiclient';
import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';

export class BrpApi {
  endpoint: string;
  client: any;
  constructor(client: any) {
    this.endpoint = process.env.BRP_API_URL ? process.env.BRP_API_URL : 'Irma';
    this.client = client ? client : new ApiClient();
  }

  async getBrpData(bsn: string) {
    try {
      const aBsn = new Bsn(bsn);
      let data = await this.client.requestData(this.endpoint, { bsn: aBsn.bsn }, { 'Content-type': 'application/json' });
      if (data?.Persoon) {
        return data;
      } else {
        throw new Error('Er konden geen persoonsgegevens opgehaald worden.');
      }
    } catch (error: any) {
      const data = {
        error: error.message,
      };
      return data;
    }
  }
}
