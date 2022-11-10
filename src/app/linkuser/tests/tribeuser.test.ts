import * as fs from 'fs';
import path from 'path';
import { ApiClient } from '@gemeentenijmegen/apiclient';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { BrpApi } from '../BrpApi';
import { TribeApi } from '../TribeApi';
import { TribeUser } from '../TribeUser';

const axiosMock = new MockAdapter(axios);

beforeAll(() => {
  if (process.env.VERBOSETESTS != 'True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
    global.console.debug = jest.fn();
  }
});

beforeEach(() => {
  axiosMock.reset();
});

describe('Tribe User', () => {
  test('checking existing user returns', async () => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900222670', api);
    expect(await tribeUser.exists()).toBe(true);
  });

  test('checking empty user', async () => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-empty.json');
    axiosMock.onGet().reply(200, returnData);
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.exists()).toBe(false);
  });

  test('update existing user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);

    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.create({
      FirstName: 'Joost',
      LastName: 'Nieuwe tester',
    })).toBe('1234');
  });

  test('create new person and inwoner relationship', async() => {
    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.create({
      FirstName: 'Jan',
      MiddleName: 'van de',
      LastName: 'Tester',
    })).toBe(true);
  });

  test('link an inwoner relationship to a contactmoment', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.addToContactMoment('1234')).toBe(true);
  });
});
describe('Handling addresses', () => {
  test('Check if user has address', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.hasAddress()).toBe(true);
  });

  test('Check if user has address, empty', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-empty.json');
    axiosMock.onGet().reply(200, returnData);

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.hasAddress()).toBe(false);
  });

  test('Check if user has address, user without address', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person-no-address.json');
    axiosMock.onGet().reply(200, returnData);

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.hasAddress()).toBe(false);
  });

  test('Update address', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    let result;
    result = await tribeUser.updateAddress({
      Street: 'Some street',
      HouseNumber: 12,
      Postalcode: '6511 PP',
      City: 'Nijmegen',
    });
    expect(result).toBe('1234');
  });

  test('Create address', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person-no-address.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    let result;
    result = await tribeUser.createAddress({
      Street: 'Some street',
      HouseNumber: 12,
      Postalcode: '6511 PP',
      City: 'Nijmegen',
    });
    expect(result).toBe('1234');
  });


});

describe('Linking flow', () => {
  test('run entire flow with existing user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    await tribeUser.create({
      FirstName: 'Jan',
      MiddleName: 'van de',
      LastName: 'Tester',
    });
    await tribeUser.addToContactMoment('1234');
  });

  test('run entire flow with new user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-empty.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    await tribeUser.create({
      FirstName: 'Jan',
      MiddleName: 'van de',
      LastName: 'Tester',
    });
    await tribeUser.createAddress({
      City: 'Nijmegen',
      HouseNumber: 13,
      Postalcode: '1234AB',
      Street: 'Somestreet',
    });
    await tribeUser.addToContactMoment('1234');
  });
});

describe('BRP birthday to YYYY-MM-dd', () => {
  test('api can return formatted birthdates', async () => {
    const client = new ApiClient();
    const api = new BrpApi(client);
    expect(api.iso8601FormattedBirthday('01-12-1854')).toBe('1854-12-01');
    expect(api.iso8601FormattedBirthday('10-11-2022')).toBe('2022-11-10');
    expect(api.iso8601FormattedBirthday('11-2022')).toBeUndefined();
  });
});

describe('BRP housenumber', () => {
  test('house number', () => {
    const client = new ApiClient();
    const api = new BrpApi(client);
    api.houseNumberHelper('12');
    api.houseNumberHelper('12a');
    api.houseNumberHelper('12 a');
    api.houseNumberHelper('12345');
    api.houseNumberHelper('123456');
    api.houseNumberHelper('by 12');
  });
});

async function getStringFromFilePath(filePath: string) {
  return new Promise((res, rej) => {
    fs.readFile(path.join(__dirname, filePath), (err, data) => {
      if (err) { return rej(err); }
      return res(data.toString());
    });
  });
}

async function jsonFromPath(filePath: string) {
  return getStringFromFilePath(filePath)
    .then((data: any) => {
      return JSON.parse(data);
    });
}