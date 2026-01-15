import { NotificationController } from '../src/modules/notification/notification.controller';
import { NotificationService } from '../src/modules/notification/notification.service';
import { testingModule } from './testing.module';

const url = '/notification';
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let user2 = {
  sub: 'cm98rxcsa00007kikjhvitzh3',
  email: 'multicuenta_Quezada1@google.com',
  accessToken: "",
  refreshToken: "",
}

let notificationId: string;

describe(`NotificationController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(NotificationController, NotificationService)
    await app.createTokens(user)
    await app.createTokens(user2)
  })

  
  describe(`{${url}/create, POST}`, () => {
    beforeAll( ()=>{
      app.setUrl(`${url}/create`)
      app.setTokens(user2)
    })

    it(`Should return a 201 if notification was created successfully`, async () => {
      const response = await app.postObject({
        recieverId: user.sub,
        header: "Invitacion a proyecto Pasantias",
        content: "Invitacion a proyecto Pasantias",
        type: "Invitacion"
      })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Notification created successfully')
      notificationId = response.body["encryptedResponse"]["notification"].id
    });

    it(`Should return a 404 if user with id falseId doesn't exist`, async () => {
      const response = await app.postObject({
        recieverId: "falseId",
        header: "Invitacion a proyecto x",
        content: "Invitacion a proyecto X",
        type: "Invitacion"
      })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User with ID 'falseId' not found`)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({
        recieverId: 0,
        content: 0,
      })
      expect(response.status).toBe(400)
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return all the notification of the user`, async () => {
      app.setUrl(`${url}`)
      app.setTokens(user)
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"][0].recieverId).toBe(user.sub)
    });
  })
  

  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update/${notificationId}`)
      app.setTokens(user)
    })

    it(`Should return a 201 if notification was updated successfully`, async () => {
      const response = await app.postObject({ read: true })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Notification updated successfully')
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if read is send as null`, async () => {
      const response = await app.postObject({ read: null })
      expect(response.status).toBe(400)
    });
  })


  describe(`{${url}/delete/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/delete/${notificationId}`)
      app.setTokens(user)
    })

    it(`Should return a 201 if notification was deleted successfully`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Notification deleted successfully')
    });
  })

  afterAll(async () => {
    await app.closeApp()
  })
})
