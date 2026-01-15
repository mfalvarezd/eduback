import { SubscriptionBaseController } from '../src/modules/subscription/base/subscription-base.controller';
import { SubscriptionBaseService } from '../src/modules/subscription/base/subscription-base.service';
import { testingModule } from './testing.module';

const url = '/subscription-base';
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

const subscriptionId = "cm9d5c1pg0009ji1kmqz8sv9d"

describe(`SubscriptionBaseController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(SubscriptionBaseController, SubscriptionBaseService)
    await app.createTokens(user)
    app.setUrl(url)
    app.setTokens(user)
  })


  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it return the suscription whit the id ${subscriptionId}`, async () => {
      const response = await app.getWithUrl(`${url}/${subscriptionId}`)
      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"].id).toBe(`${subscriptionId}`)
    });

    it(`Should return a 404 if suscription base doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/falseId`)
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Subscription with ID: 'falseId' not found`)
    });
  })


  afterAll(async () => {
    await app.closeApp()
  })
})
