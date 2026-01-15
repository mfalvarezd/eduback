import { SettingsController } from '../src/modules/settings/settings.controller';
import { SettingsService } from '../src/modules/settings/settings.service';
import { testingModule } from './testing.module';

const url = "/settings";
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let nullUser = {
  sub: 'cm98rxcsa00007kikjhvitzh3',
  email: 'multicuenta_Quezada1@google.com',
  accessToken: "",
  refreshToken: "",
}

let settingId = null;

describe('SettingsController', () => {
  beforeAll(async () => {
    await app.createApp(SettingsController, SettingsService)
    await app.createTokens(user)
    await app.createTokens(nullUser)
    app.setUrl(url)
    app.setTokens(user)
  });

  
  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if id user is valid`, async () => {
      const response = await app.postObject({ userId: user.sub })
      
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Settings created successfully');
      settingId = response.body["encryptedResponse"]["setting"].id
    });

    it(`Should return a 409 if id user already have settings`, async () => {
      const response = await app.postObject({ userId: user.sub })
      
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe(`Settings already exist for user with ID '${user.sub}'`);
    });
  });


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return user's settings`, async () => {
      const response = await app.getWithToken()
      
      expect(response.status).toBe(200);
      expect(response.body["encryptedResponse"].userId).toBe(user.sub);
    });

    it(`Should return a 404 if user's settings doesn't exist`, async () => {
      app.setTokens(nullUser)
      const response = await app.getWithToken()
      
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Settings not found for user with ID '${nullUser.sub}'`);
    });
  })


  describe(`{${url}/update, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update`)
      app.setTokens(user)
    })

    it(`Should return a 201 if it updates the settings sucesfully`, async () => {
      const response = await app.postObject({
        language: "es",
        dayFormat: "DD/MM/YYYY",
        timeFormat: "HH:mm",
        timeZone: "America/Guayaquil",
        changeTimeZone: true,
        pushNotifications: true,
        activitiesNotifications: true,
        summaryNotifications: true,
        news: true,
        bin: 30,
        proyectModification: true,
        addMembers: true,
        export: true,
      })
      
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Settings updated successfully');
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        language: 0,
        dayFormat: 0,
        timeFormat: 0,
        timeZone: 0,
        changeTimeZone: "true",
        pushNotifications: "true",
        activitiesNotifications: "true",
        summaryNotifications: "true",
        news: "true",
        bin: "30",
        proyectModification: "true",
        addMembers: "true",
        export: "true",
      })
      
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        'language must be a string',
        'dayFormat must be a string',
        'timeFormat must be a string',
        'timeZone must be a string',
        'changeTimeZone must be a boolean value',
        'pushNotifications must be a boolean value',
        'activitiesNotifications must be a boolean value',
        'summaryNotifications must be a boolean value',
        'news must be a boolean value',
        'bin must be an integer number',
        'proyectModification must be a boolean value',
        'addMembers must be a boolean value',
        'export must be a boolean value'
      ]);
    });

    it(`Should return a 404 if user's settings doesn't exist`, async () => {
      app.setTokens(nullUser)
      const response = await app.postObject({})
      
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Settings not found for user with ID '${nullUser.sub}'`);
    });
  })

  
  afterAll(async () => {
    if(settingId){
      await app.getPrisma().setting.delete({where:{id: settingId}})
    }
    await app.closeApp();
  });
});