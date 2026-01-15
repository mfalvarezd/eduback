import { GroupUserController } from '../src/modules/group-user/group-user.controller';
import { GroupUserService } from '../src/modules/group-user/group-user.service';
import { testingModule } from './testing.module';

const url = '/group-users';
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

let subscriptionId: any = null
let groupId: any = null

describe(`GroupUserController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(GroupUserController, GroupUserService)
    //await app.createTokens(user)
    await app.createTokens(user2)
    app.setUrl(url)
    app.setTokens(user2)
  })


  describe(`{${url}, POST}`, () => {
    beforeAll(async () => {
      const base = await app.getPrisma().subscriptionBase.create({
        data: {
          planId: 'cm86inic30002jiz0qh9c6wsw',
        }
      })
      if(base){
        subscriptionId = base.id
      }

      const group = await app.getPrisma().subscriptionGroup.create({
        data: {
          planId: subscriptionId,
          ownerId: user2.sub
        }
      })
      if(group){
        groupId = group.id
      }
    })

    it(`Should return a 201 if member was added to the group successfully`, async () => {
      const response = await app.postObject({ groupId, userId: user.sub })
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Member added to group successfully')
    });

    it(`Should return a 409 if member was already added`, async () => {
      const response = await app.postObject({ groupId, userId: user.sub })
      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`User with ID: '${user.sub}' is already a member of group ID: '${groupId}'`)
    });

    it(`Should return a 404 if group doesn't exist`, async () => {
      const response = await app.postObject({ groupId: "falseId", userId: user.sub, })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Group with ID: 'falseId' not found`)
    });

    it(`Should return a 404 if user doesn't exist`, async () => {
      const response = await app.postObject({ groupId, userId: "falseId", })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User with ID: 'falseId' not found`)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual(["groupId must be a string","Group ID is required","userId must be a string","User ID is required"])
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({ groupId:0, userId:0, })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([ 'groupId must be a string', 'userId must be a string' ])
    });
  })


  describe(`{${url}/group/:groupId, GET}`, () => {
    it(`Should return a 200 if it return group members`, async () => {
      const response = await app.getWithUrl(`${url}/group/${groupId}`)
      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"][0].userId).toBe(user.sub)
    });

    it(`Should return a 404 if member was added to the group successfully`, async () => {
      const response = await app.getWithUrl(`${url}/group/falseId`)
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Group with ID: 'falseId' not found`)
    });
  })


  describe(`{${url}/group/:groupId/remove/:userId, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/group/${groupId}/remove/${user.sub}`)
    })

    it(`Should return a 201 if it remove the member successfully`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Member removed from group successfully')
    });

    it(`Should return a 404 if user isn't a member of the group`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User with ID: '${user.sub}' is not a member of group ID: '${groupId}'`)
    });

    it(`Should return a 404 if group doesn't exist`, async () => {
      app.setUrl(`${url}/group/falseId/remove/${user.sub}`)
      const response = await app.postObject()
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Group with ID: 'falseId' not found`)
    });
  })
  

  afterAll(async () => {
    if(groupId){
      await app.getPrisma().subscriptionGroup.delete({
        where: {id: groupId}
      })
    }
    if(subscriptionId){
      await app.getPrisma().subscriptionBase.delete({
        where: {id: subscriptionId}
      })
    }
    await app.closeApp()
  })
})
