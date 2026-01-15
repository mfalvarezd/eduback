import { DeviceHistoryController } from '../src/modules/device-history/device-history.controller';
import { DeviceHistoryService } from '../src/modules/device-history/device-history.service';
import { testingModule } from './testing.module';

const url = '/device-history';
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let emptyUser = {
  sub: 'cm98rxcsa00007kikjhvitzh3',
  email: 'multicuenta_Quezada1@google.com',
  accessToken: "",
  refreshToken: "",
}

let historyId = null;

describe(`DeviceHistoryController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(DeviceHistoryController, DeviceHistoryService)
    await app.createTokens(user)
    await app.createTokens(emptyUser)
    app.setUrl(url)
    app.setTokens(user)
  })


  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if device history was created successfully`, async () => {
      const response = await app.postObject({
        city:'Guayaquil',
        country:'Ecuador',
      })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Device history created successfully')
      historyId = response.body["encryptedResponse"]["deviceHistory"].id
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return all the device history of the user`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if user doesn't have device history`, async () => {
      app.setTokens(emptyUser)
      const response = await app.getWithToken()
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`No device history found for user with ID '${emptyUser.sub}'`)
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update/${historyId}`)
      app.setUseOfToken(false)
    })

    it(`Should return a 201 if device history was updated successfully`, async () => {
      const response = await app.postObject({ status: "Sesion cerrada" })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Device history updated successfully')
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe(`Status is required`)
    });

    it(`Should return a 400 if status is send as null`, async () => {
      const response = await app.postObject({ status: null })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe(`Status is required`)
    });

    it(`Should return a 404 if device history doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.postObject({ status: "Sesion cerrada" })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Device history not found`)
    });
  })
  

  afterAll(async () => {
    if(historyId){
      await app.getPrisma().deviceHistory.delete({where: {id: historyId}})
    }
    await app.closeApp()
  })
})
