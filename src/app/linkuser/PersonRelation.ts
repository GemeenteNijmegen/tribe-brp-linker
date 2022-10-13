import { TribeApi } from './TribeApi';

/**
 * PersonRelation models the Tribe PersonRelation entity
 */
export interface PersonRelation {
  /**
   * Tribe internal ID (a UUID). Only add when updating a PersonRelation
   */
  ID?: string;

  /**
   * BSN (internal Tribe ID for BSN field)
   */
  [TribeApi.bsnField]?: string;
  FirstName: string;
  LastName: string;
  MiddleName: string;
}
