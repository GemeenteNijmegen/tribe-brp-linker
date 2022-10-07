import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { PersonRelationFields } from './PersonRelationFields';
import { TribeApi } from './TribeApi';

export class TribeUser {
  private tribeApi: TribeApi;
  private bsn: Bsn;
  private relationId?: string;
  private inwonerId?: string;

  constructor(bsn: string | Bsn, api: TribeApi) {
    this.tribeApi = api;
    if (typeof bsn === 'string') {
      this.bsn = new Bsn(bsn);
    } else {
      this.bsn = bsn;
    }
  }

  async checkIfExists() {
    const result = await this.getRelationAndInwonerIDs();
    if (result) {
      return true;
    }
    return false;
  }

  async getRelationAndInwonerIDs(): Promise<false | { inwonerId: string; relationId: string }> {
    if (!this.relationId) {
      const data = await this.tribeApi.requestInwonerWithRelation(this.bsn.bsn);
      console.debug(data);
      if (data && data.value && data['@odata.context'] == `$metadata#OData.${this.tribeApi.inwonerType}`) {
        if (data.value.length > 1) {
          console.warn('More than one relation with the same BSN found');
        }
        if (data.value.length == 0) {
          return false;
        }
        this.relationId = data.value[0].Person.ID;
        this.inwonerId = data.value[0].ID;
        if (typeof this.inwonerId === 'string' && typeof this.relationId === 'string') {
          console.debug('found relation + inwoner');
          return { inwonerId: this.inwonerId, relationId: this.relationId };
        }
      }
    }
    return false;
  }

  async getRelationId() {
    if (!this.relationId) {
      const data = await this.tribeApi.requestRelation(this.bsn.bsn);
      if (data && data.value && data['@odata.context'] == '$metadata#OData.Relation_Person') {
        if (data.value.length > 1) {
          console.warn('More than one relation with the same BSN found');
        }
        if (data.value.length == 0) {
          return false;
        }
        this.relationId = data.value[0].ID;
      }
    }
    return this.relationId;
  }

  async update(fields: Partial<PersonRelationFields>) {
    console.debug('updating user', fields);
    if (!this.relationId) {
      console.debug('no relation id');
      const ids = await this.getRelationAndInwonerIDs();
      if (!ids) {
        console.error('id error');
        throw Error('No person with this BSN found to update');
      }
    }
    const fieldsIncludingID: Partial<PersonRelationFields> = {
      ID: this.relationId,
      ...fields,
    };
    console.debug('about to post');
    try {
      const result = await this.tribeApi.postRelation(fieldsIncludingID);
      console.debug('updated user', this);
      console.debug(result);
      return result;
    } catch (error) {
      console.error('Updating user failed', error);
    }
  }

  async create(fields: PersonRelationFields): Promise<boolean> {
    console.debug('creating user', fields);
    try {
      const personRelationId = await this.tribeApi.postRelation(fields);
      if (!personRelationId) {
        throw Error('Failed to create PersonRelation');
      }
      const inwonerId = await this.tribeApi.postInwoner({
        Name: fields.FirstName,
        Person: {
          ID: personRelationId,
        },
      });
      this.relationId = personRelationId;
      this.inwonerId = inwonerId;
      console.debug('created user', this);
      return true;
    } catch (error) {
      console.debug(error);
      return false;
    }
  }

  async addToContactMoment(contactId: string): Promise<boolean> {
    console.debug('adding to contact moment', contactId);
    if (!this.inwonerId) {
      await this.getRelationAndInwonerIDs();
      if (!this.inwonerId) {
        throw Error('unable to retrieve inwoner ID. Cannot link user');
      }
    }
    try {
      const result = await this.tribeApi.postRelationshipToContactMoment(contactId, this.inwonerId);
      console.debug('Added to contact moment', result);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

}