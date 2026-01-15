import { UserDeviceController } from '../src/modules/user-device/user-device.controller'
import { UserDeviceService } from '../src/modules/user-device/user-device.service'
import { testingModule } from './testing.module';

const url = "/user-device";
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

let deviceId = null
const create = { 
  device: "Mac OS X",
  deviceId: "AB9120CD-E432-12FG-J123"
}

describe('UserDeviceController', () => {
  beforeAll(async () => {
    await app.createApp(UserDeviceController, UserDeviceService)
    await app.createTokens(user)
    await app.createTokens(nullUser)
    app.setUrl(url)
    app.setTokens(user)
  });
  

  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if the data is valid`, async () => {
      const response = await app.postObject( create )
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('User device created successfully');
      deviceId = response.body["encryptedResponse"]["userDevice"].id
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        "device must be a string",
        "Device is required",
        "deviceId must be a string",
        "DeviceId is required"
      ]);
    });

    it(`Should return a 409 if device is already registed`, async () => {
      const response = await app.postObject( create )
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe(`user already have the device ${create.deviceId}`);
    });
  });
  

  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return the user's devices`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200);
    });

    it(`Should return a 404 if user doesn't have device registed`, async () => {
      app.setTokens(nullUser)
      const response = await app.getWithToken()
      
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`No devices found for user with ID '${nullUser.sub}'`);
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update/${deviceId}`)
      app.setTokens(user)
    })

    it(`Should return a 201 if it update user's device successfully`, async () => {
      const response = await app.postObject({
        device: "MSI L",
        active: true
      })

      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Device updated successfully')
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({
        device: 0,
        active: "true"
      })
      
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([ 'device must be a string', 'active must be a boolean value' ])
    });

    it(`Should return a 400 if device is send as null`, async () => {
      const response = await app.postObject({
        device: null
      })
      
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe("Device can't be send as null")
    });

    it(`Should return a 400 if active is send as null`, async () => {
      const response = await app.postObject({
        active: null
      })
      
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe("Active can't be send as null")
    });

    it(`Should return a 403 if user doesn't have permissions`, async () => {
      app.setTokens(nullUser)
      const response = await app.postObject({
        device: "Mac OS X",
        active: true
      })
      
      expect(response.status).toBe(403);
      expect(response.body["message"]).toBe("You do not have permission to update this device")
    });

    it(`Should return a 404 if device doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.postObject({
        device: "Mac OS X",
        active: true
      })
      
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe("Device not found")
    });
  })


  afterAll(async () => {
    if(deviceId){
      await app.getPrisma().userDevice.delete({where:{id: deviceId}})
    }
    await app.closeApp();
  });
});