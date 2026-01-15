import { UsersController } from '../src/modules/users/users.controller';
import { testingModule } from './testing.module';

const url = "/users";
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

describe(`UsersController {${url}}`, () => {
  beforeAll(async () => {
    app.addController(UsersController)
    await app.initApp()
    await app.createTokens(user)
    app.setUrl(url)
    app.setTokens(user)
  });


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it returns all the users`, async () => {
      await app.goodGetWithUrl(url)
    });
  });


  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it return the user`, async () => {
      const response = await app.getWithUrl(`${url}/${user.sub}`)
      expect(response.status).toBe(200);
      expect(response.body["encryptedData"]["email"]).toBe(user.email)
    });

    it(`Should return a 404 if the user doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/idfalse`)
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe("User with id 'idfalse' not found")
    });
  });


  describe(`{${url}/profile, GET}`, () => {
    it(`Should return a 200 if it return the user of the token`, async () => {
      app.setUrl(`${url}/profile`)
      const response = await app.getWithToken()
      expect(response.status).toBe(200);
      expect(response.body["encryptedData"]["email"]).toBe(user.email)
    });

    it(`Should return a 401 if tokens aren't sent`, async () => {
      const response = await app.getWithUrl(`${url}/profile`)
      expect(response.status).toBe(401);
    });
  });


  describe(`{${url}/update, POST}`, () => {
    beforeAll(() => { app.setUrl(`${url}/update`) })

    it(`Should return a 201 if it updates the user firstname`, async () => {
      const response = await app.postObject({ firstName: "Luis" })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('User updated successfully')
      expect(response.body["encryptedResponse"]["user"]).toBe(user.email)
    });

    it(`Should return a 201 if it updates the user data`, async () => {
      const response = await app.postObject({
        firstName: "Luis",
        lastName: "Quezada",
        cellphone: "0994444444",
        country: "Ecuador",
        city: "Guayaquil",
        userName: "Luquaris18",
        birthday: new Date('2002-11-18'),
        role: "usuario",
        job: "Ingeniero en computación",
        department: "Computación",
        type: "Emprendedor",
      })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('User updated successfully')
      expect(response.body["encryptedResponse"]["user"]).toBe(user.email)
    });

    it(`Should return a 409 if username is already registred`, async () => {
      const response = await app.postObject({ userName: "multicuentaQue1" })
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe('This username already exists')
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        firstName: 0,
        lastName: 0,
        cellphone: 0,
        country: 0,
        city: 0,
        userName: 0,
        birthday: true,
        role: 0,
        job: 0,
        department: 0,
        type: 0,
      })
      expect(response.status).toBe(400)
      expect(response.body['message']).toEqual([
        'firstName must be a string',
        'lastName must be a string',
        'cellphone must be a string',
        'country must be a string',
        'city must be a string',
        'userName must be a string',
        'role must be a string',
        'job must be a string',
        'department must be a string',
        'type must be a string'
      ])
    });

    it(`Should return a 400 if userName is send as null`, async () => {
      const response = await app.postObject({ userName: null })
      expect(response.status).toBe(400)
      expect(response.body['message']).toBe("Username can't be send as null")
    });

    it(`Should return a 400 if role is send as null`, async () => {
      const response = await app.postObject({ role: null })
      expect(response.status).toBe(400)
      expect(response.body['message']).toBe("Role can't be send as null")
    });
  });
  

  afterAll(async () => {
    await app.closeApp();
  });
});