import fs from 'fs';
import path from 'path';

export class FileApiClient {
  /**
     * Connects to API's. Use .requestData() to get the actual info
     *
     * @param {string} bsn BSN to request uitkeringsdata for
     * @param {string|null} cert optional client cert, default is env variable MTLS_CLIENT_CERT
     * @param {string|null} key optional private key for client cert, default will get key from secret store
     * @param {string|null} ca optional root ca bundle to trust, default is env variable MTLS_ROOT_CA
     */
  constructor() {

  }

  /**
     * Request data from the API.
     * @returns {string|object} XML string or javascript object
     */
  async requestData(endpoint: string, _body: string, _headers: string) {
    let file = '';
    let parse: any = false;
    if (endpoint.indexOf('mijnNijmegenData')>=0) {
      file = 'uitkering-12345678.xml';
    }
    if (endpoint.indexOf('Irma')>=0) {
      file = 'brp-12345678.json';
      parse = 'json';
    }
    const filePath = path.join('tests/responses', file);
    return this.getStringFromFilePath(filePath)
      .then((data: any) => {
        if (parse == 'json') {
          data = JSON.parse(data);
        }
        return data;
      })
      .catch((_err) => { return ''; });
  }

  async getStringFromFilePath(filePath: string) {
    return new Promise((res, rej) => {
      fs.readFile(path.join(__dirname, filePath), (err, data) => {
        if (err) {return rej(err);}
        return res(data.toString());
      });
    });
  }
}