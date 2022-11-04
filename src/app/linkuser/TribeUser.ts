import { Bsn } from '@gemeentenijmegen/utils/lib/Bsn';
import { Address } from './Address';
import { PersonRelation } from './PersonRelation';
import { TribeApi } from './TribeApi';

export class TribeUser {
  private tribeApi: TribeApi;
  private bsn: Bsn;
  private relationId?: string;
  private inwonerId?: string;
  private addressId?: string;

  constructor(bsn: string | Bsn, api: TribeApi) {
    this.tribeApi = api;
    if (typeof bsn === 'string') {
      this.bsn = new Bsn(bsn);
    } else {
      this.bsn = bsn;
    }
  }

  async exists() {
    await this.getRelationAndInwonerIDs();
    if (this.relationId) {
      return true;
    }
    return false;
  }

  async hasAddress() {
    await this.getRelationAndInwonerIDs();
    if (this.addressId) {
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
        this.addressId = data.value[0].Person.Address?.ID;

        if (typeof this.inwonerId === 'string' && typeof this.relationId === 'string') {
          console.debug('found relation + inwoner');
          return { inwonerId: this.inwonerId, relationId: this.relationId };
        }
      }
    }
    return false; //TODO: BUG?
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

  async update(fields: Partial<PersonRelation>) {
    console.debug('updating user', fields);
    if (!this.relationId) {
      console.debug('no relation id');
      const ids = await this.getRelationAndInwonerIDs();  
      if (!ids) {
        console.error('id error in person update');
        throw Error('No person with this BSN found to update');
      }
    }
    const fieldsIncludingID: Partial<PersonRelation> = {
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

  async create(fields: PersonRelation): Promise<boolean> {
    // If user already exists, don't create but update
    if(await this.exists()) {
      return await this.update(fields);
    }
    console.debug('creating user', fields);
    try {
      // Add BSN to new relation in Tribe.
      fields[TribeApi.bsnField] = this.bsn.bsn;
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

  async updateAddress(fields: Partial<Address>) {
    console.debug('updating address', fields);
    if (!this.addressId || !this.relationId) {
      console.debug('no address id, you should create an address. Not update this one.');
      await this.getRelationAndInwonerIDs();
      if (!this.relationId) {
        console.error('id error in address update (no relation');
        throw Error('No person with this BSN found to update');
      }
      if (!this.addressId) {
        console.error('id error in address update (no address)');
        throw Error('No address found for this person, use createAddress');
      }
    }
    const fieldsIncludingID: Partial<Address> = {
      ID: this.addressId,
      ...fields,
    };
    console.debug('about to post');
    try {
      const result = await this.tribeApi.postAddress(fieldsIncludingID, this.relationId);
      console.debug('updated address', this);
      console.debug(result);
      return result;
    } catch (error) {
      console.error('Updating address failed', error);
    }
  }

  async createAddress(fields: Partial<Address>) {
    console.debug('updating address', fields);
    if(await this.hasAddress()) {
      this.updateAddress(fields);
    }
    if (!this.relationId) {
      await this.getRelationAndInwonerIDs();
      if (!this.relationId) {
        console.error('id error (no person)');
        throw Error('No person with this BSN found to update');
      }
    }
    console.debug('about to post');
    try {
      const result = await this.tribeApi.postAddress(fields, this.relationId);
      console.debug('created address', this);
      console.debug(result);
      return result;
    } catch (error) {
      console.error('Updating address failed', error);
    }
  }
}