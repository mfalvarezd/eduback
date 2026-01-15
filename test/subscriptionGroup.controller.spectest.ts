import { SubscriptionGroupController } from '../src/modules/subscription/group/subscription-group.controller';
import { SubscriptionGroupService } from '../src/modules/subscription/group/subscription-group.service';
import { testingModule } from './testing.module';

const url = '/subscription-group';
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let subscriptionId: any = null
let groupId = null

describe(`SubscriptionGroupController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(SubscriptionGroupController, SubscriptionGroupService)
    await app.createTokens(user)
    app.setUrl(url)
    app.setTokens(user)
  })


  describe(`{${url}, POST}`, () => {
    beforeAll(async () => {
      const data = await app.getPrisma().subscriptionBase.create({
        data: {
          planId: 'cm86inic30002jiz0qh9c6wsw',
        }
      })
      if(data){
        subscriptionId = data.id
      }

    })
    it(`Should return a 201 if group was created sucesfully`, async () => {
      const response = await app.postObject({ subscriptionId })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Subscription group created successfully')
      groupId = response.body["encryptedResponse"]["subscriptionGroup"].id
    });

    it(`Should return a 409 if a group already exists`, async () => {
      const response = await app.postObject({ subscriptionId })
      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`A group already exists for subscription '${subscriptionId}'`)
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({ subscriptionId: 0 })
      expect(response.status).toBe(400)
      expect(response.body["message"][0]).toBe('subscriptionId must be a string')
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'Subscription ID is required',
        'subscriptionId must be a string'
      ])
    });

    it(`Should return a 404 if suscription base doesn't exist`, async () => {
      const response = await app.postObject({ subscriptionId: "falseId" })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Subscription Base not found with ID 'falseId'`)
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it returns all the subscriptions groups`, async () => {
      const response = await app.getWithUrl(url)
      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"]["message"]).toBe('Subscription groups retrieved successfully')
    });
  })


  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it returns the subscriptions groups`, async () => {
      const response = await app.getWithUrl(`${url}/${groupId}`)
      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"]["message"]).toBe(`Subscription group retrieved successfully`)
    });

    it(`Should return a 404 if the subscriptions groups doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/falseId`)
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Subscription group not found with ID 'falseId'`)
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update/${groupId}`)
      app.setUseOfToken(false)
    })

    it(`Should return a 201 if it updates successfully the subscription group`, async () => {
      const response = await app.postObject({
        planId: subscriptionId,
        ownerId: user.sub,
      })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Subscription group updated successfully')
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        planId: 0,
        ownerId: 0,
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([ 'planId must be a string', 'ownerId must be a string' ])
    });

    it(`Should return a 400 if planId is send as null`, async () => {
      const response = await app.postObject({ planId: null, })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe("PlanId can't be send as null")
    });

    it(`Should return a 400 if ownerId is send as null`, async () => {
      const response = await app.postObject({ ownerId: null, })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe("OwnerId can't be send as null")
    });

    it(`Should return a 404 if user doesn't exist`, async () => {
      const response = await app.postObject({ ownerId: "falseId", })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User not found with ID 'falseId'`)
    });

    it(`Should return a 404 if subscription base doesn't exist`, async () => {
      const response = await app.postObject({ planId: "falseId", })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Subscription Base not found with ID 'falseId'`)
    });

    it(`Should return a 404 if the subscriptions groups doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.getWithUrl(`${url}/falseId`)
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Subscription group not found with ID 'falseId'`)
    });

    // it(`Should return a 409 if subscription planId have a group`, async () => {
    //   const response = await app.postObject({ planId: subscriptionId })
    //   expect(response.status).toBe(409)
    //   expect(response.body["message"]).toBe(`A group already exists for subscription '${subscriptionId}'`)
    // });
  })
  

  afterAll(async () => {
    if(groupId){
      await app.getPrisma().subscriptionGroup.delete({where:{id: groupId}})
    }
    if(subscriptionId){
      await app.getPrisma().subscriptionBase.delete({where:{id: subscriptionId}})
    }
    await app.closeApp()
  })
})
