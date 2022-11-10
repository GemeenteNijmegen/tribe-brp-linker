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

  /** According to the [logisch ontwerp BRP 4.0](https://www.rvig.nl/brp/documenten/publicaties/2022/03/31/logisch-ontwerp-brp-4.0),
   * a house number can consist of
   * - 1-5 digits
   * - an appending letter
   * - an alphanumeric appending string
   *
   * - there might be a notation without a number, consisting of a string of the form
   * `by N` or `to N`.
   *
   * This function captures the first 1-5 digits as the number, and everything else
   * as the suffix. If the start is not numeric, the number will be returned as 0, and the rest
   * as the suffix.
   */
  houseNumberHelper(brpNumber: string): { number: number; suffix: string } {
    const matches = brpNumber.match(/(^\d{1,5})(.*)/);
    if (matches !== null) {
      const result = { number: Number(matches[1]), suffix: matches[2] };
      return result;
    }
    return { number: 0, suffix: brpNumber };
  }

  /**
   *
   * @param brpDirthDay the birthday as provided by the API (dd-mm-yyyy format)
   * @returns iso 8601 'extended' formatted date (YYYY-MM-DD)
   */
  iso8601FormattedBirthday(brpDirthDay: string) {
    // Ignore incomplete dates.
    if (brpDirthDay.length !== 'yyyy-mm-dd'.length) { return undefined; }

    const year = brpDirthDay.substring('dd-mm-'.length, 'dd-mm-yyyy'.length);
    const month = brpDirthDay.substring('dd-'.length, 'dd-mm'.length);
    const day = brpDirthDay.substring(0, 'dd'.length);
    return `${year}-${month}-${day}`;
  }
}
