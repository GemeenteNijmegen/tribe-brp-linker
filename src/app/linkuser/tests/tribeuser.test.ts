import * as fs from 'fs';
import path from 'path';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { TribeApi } from '../TribeApi';
import { TribeUser } from '../TribeUser';

const axiosMock = new MockAdapter(axios);

beforeAll(() => {
  if (process.env.VERBOSETESTS != 'True') {
    global.console.error = jest.fn();
    global.console.time = jest.fn();
    global.console.log = jest.fn();
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
    expect(await tribeUser.checkIfExists()).toBe(true);
  });

  test('checking empty user', async () => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-empty.json');
    axiosMock.onGet().reply(200, returnData);
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.checkIfExists()).toBe(false);
  });

  test('update existing user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);

    axiosMock.onPost().reply(200, { ID: '1234' });

    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    expect(await tribeUser.update({
      LastName: 'Joost de nieuwe Tester',
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

describe('Linking flow', () => {
  test('run entire flow with existing user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-expanded-person.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    const exists = tribeUser.checkIfExists();
    if (!exists) {
      await tribeUser.create({
        FirstName: 'Jan',
        MiddleName: 'van de',
        LastName: 'Tester',
      });
    } else {
      await tribeUser.update({
        FirstName: 'Jan',
        MiddleName: 'van de',
        LastName: 'Tester',
      });
    }
    await tribeUser.addToContactMoment('1234');
  });

  test('run entire flow with new user', async() => {
    const returnData = await jsonFromPath('responses/tribe-relationship-inwoner-empty.json');
    axiosMock.onGet().reply(200, returnData);
    axiosMock.onPost().reply(200, { ID: '1234' });
    const api = new TribeApi('access-token-goes-here');
    const tribeUser = new TribeUser('900070341', api);
    const exists = await tribeUser.checkIfExists();
    console.debug(exists);
    if (!exists) {
      await tribeUser.create({
        FirstName: 'Jan',
        MiddleName: 'van de',
        LastName: 'Tester',
      });
    } else {
      await tribeUser.update({
        FirstName: 'Jan',
        MiddleName: 'van de',
        LastName: 'Tester',
      });
    }
    await tribeUser.addToContactMoment('1234');
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