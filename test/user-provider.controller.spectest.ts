import { UserProviderController } from '../src/modules/user-provider/user-provider.controller';
import { UserProviderService } from '../src/modules/user-provider/user-provider.service';
import { testingModule } from './testing.module';

const url = '/user-provider';
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let id = null

describe(`UserProviderController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(UserProviderController, UserProviderService)
    await app.createTokens(user)
    app.setUrl(url)
    app.setTokens(user)
  })


  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if the provider's data are valid`, async () => {
      const response = await app.postObject({
        provider: "test_Spec_201",
        providerId: "R276RYT27UYRT672W3RT72T7",
      })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('User provider created successfully')
      id = response.body["encryptedResponse"]["userProvider"].id
    });

    it(`Should return a 409 if provider is already registed`, async () => {
      const response = await app.postObject({
        provider: "test_Spec_201",
        providerId: "R276RYT27UYRT672W3RT72T7",
      })
      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`A provider already exists for this user with provider 'test_Spec_201'`)
    });

    it(`Should return a 400 if provider's data are invalid`, async () => {
      const response = await app.postObject({
        provider: 0,
        providerId: 0,
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([ 'provider must be a string', 'providerId must be a string' ])
    });

    it(`Should return a 400 if provider's data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'Provider is required',
        'provider must be a string',
        'Provider ID is required',
        'providerId must be a string'
      ])
    });
  })


  describe(`{${url}/user/:userId, GET}`, () => {
    it(`Should return a 200 if provider are found for user with id ${user.sub}`, async () => {
      app.setUrl(`${url}/user/${user.sub}`)
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if the user doesn't have providers`, async () => {
      app.setUrl(`${url}/user/falseId`)
      const response = await app.getWithToken()
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`No providers found for user with ID 'falseId'`)
    });
  })


  afterAll(async () => {
    if(id){
      await app.getPrisma().userProvider.delete({where:{id}})
    }
    await app.closeApp()
  })
})
