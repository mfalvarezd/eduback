import { UserNetworkController } from '../src/modules/user-network/user-network.controller';
import { UserNetworkService } from '../src/modules/user-network/user-network.service';
import { testingModule } from './testing.module';

const url = "/user-network";
const app = new testingModule()

const user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

const nullUser = {
  sub: 'cm98rxcsa00007kikjhvitzh3',
  email: 'multicuenta_Quezada1@google.com',
  accessToken: "",
  refreshToken: "",
}

let networkId = null

describe('UserNetworkController', () => {
  beforeAll(async () => {
    await app.createApp(UserNetworkController, UserNetworkService)
    await app.createTokens(user)
    await app.createTokens(nullUser)
    app.setUrl(url)
    app.setTokens(user)
  });

  
  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if the data is valid`, async () => {
      const response = await app.postObject({ network: "Google" })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('User network created successfully');
      networkId = response.body["encryptedResponse"]["userNetwork"].id
    });

    it(`Should return a 400 if network is null`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        "network must be a string",
        "Network is required"
      ]);
    });

    it(`Should return a 409 if user already has a network`, async () => {
      const response = await app.postObject({ network: "Google" })
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe("User already has a network");
    });
  });


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return the user's network`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200);
    });

    it(`Should return a 404 if user doesn't have networks registed`, async () => {
      app.setTokens(nullUser)
      const response = await app.getWithToken()
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`No networks found for user with ID '${nullUser.sub}'`);
    });
  })


  describe(`{${url}/update, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update`)
      app.setTokens(user)
    })

    it(`Should return a 201 if it update user's network`, async () => {
      const response = await app.postObject({
        network: "Google",
        connection: true
      })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Network updated successfully')
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({
        network: 0,
        connection: "true"
      })
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([ 'network must be a string', 'connection must be a boolean value' ])
    });

    it(`Should return a 400 if network is send as null`, async () => {
      const response = await app.postObject({ network: null })
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe("Network can't be send as null")
    });

    it(`Should return a 400 if connection is send as null`, async () => {
      const response = await app.postObject({ connection: null })
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe("Connection can't be send as null")
    });

    it(`Should return a 404 if network doesn't exist`, async () => {
      app.setTokens(nullUser)
      const response = await app.postObject({
        network: "Hotmail",
        connection: true
      })
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Network not found for user with ID '${nullUser.sub}'`)
    });
  })
  
  afterAll(async () => {
    if(networkId){
      await app.getPrisma().userNetwork.delete({where:{id:networkId}})
    }
    await app.closeApp();
  });
});