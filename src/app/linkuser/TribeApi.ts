import axios, { AxiosInstance } from 'axios';
import { Address } from './Address';
import { InwonerRelationship } from './InwonerRelationship';
import { PersonRelation } from './PersonRelation';

export class TribeApi {
  public static readonly bsnField = '_9ecc8d21__f69a__4f4c__a239__5db7a5f21ddd';
  public readonly inwonerType = 'e0d6534a__cc84__4cf7__bdc5__d32f9311c09e';
  private contactMomentType = 'ec99e518__c6e2__4e5c__81b5__7f20ab721737';
  private baseUrl = 'https://api.tribecrm.nl/v1/odata';
  private axios: AxiosInstance;

  constructor(access_token: string) {
    this.axios = axios.create(
      {
        baseURL: this.baseUrl,
        params: {
          access_token: access_token,
        },
      },
    );
  }

  async get(url: string, params?: any): Promise<any> {
    try {
      console.debug('getting ', this.axios.getUri({ url, params }));
      const response = await this.axios.get(url, { params });
      if (response.status != 200) {
        console.debug(response.request.responseURL);
        throw Error('Unexpected response: ' + response.status);
      }
      if (typeof response.data === 'string') {
        return JSON.parse(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.status);
        console.log(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.log(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.log('Error', error.message);
      }
      console.log(error.config);
      return error;
    }
  }

  async post(url: string, params?: any) {
    try {
      const response = await this.axios.post(url, params);
      if (typeof response.data === 'string') {
        return JSON.parse(response.data);
      }
      return response.data;
    } catch (error: any) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.status);
        console.error(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
      }
      throw Error(error);
    }
  }

  // Add filter to url because axios escapes spaces, tribe doesn't handle this
  async requestRelation(bsn: string): Promise<any> {
    const result = await this.get(`/Relation_Person?$filter=${TribeApi.bsnField} eq '${bsn}'`);
    return result;
  }

  // Add filter to url because axios escapes spaces, tribe doesn't handle this
  async requestInwonerWithRelation(bsn: string): Promise<any> {
    const result = await this.get(`/${this.inwonerType}?$expand=Person($expand=Address)&$filter=Person/${TribeApi.bsnField} eq '${bsn}'`);
    return result;
  }

  async postRelation(params: Partial<PersonRelation>): Promise<any> {
    const result = await this.post('/Relation_Person', params);
    return result?.ID;
  }

  async postInwoner(params: InwonerRelationship): Promise<any> {
    const result = await this.post(`/${this.inwonerType}`, params);
    return result?.ID;
  }

  async postAddress(params: Partial<Address>, personId: string): Promise<any> {
    const result = await this.post('/Address', {
      ...params,
      Person: {
        ID: personId,
      },
    });
    return result?.ID;
  }

  async postRelationshipToContactMoment(contactId: string, relationshipId: string): Promise<any> {
    const result = await this.post(`/${this.contactMomentType}`, {
      ID: contactId,
      Relationship: {
        ID: relationshipId,
      },
    });
    return result?.ID;
  }
}
