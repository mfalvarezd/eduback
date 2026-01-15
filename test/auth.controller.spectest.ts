import { testingModule } from './testing.module';
import { StorageService } from '../src/storage/storage.service'
import { AuthController } from '../src/modules/auth/auth.controller';
import { HttpStatus } from '@nestjs/common';

const url = '/auth';
const app = new testingModule()
let storageService = new StorageService()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  userName: 'luquaris',
  password: 'Password123!',
  accessToken: "",
  refreshToken: "",
}

let verifyCode
let userId = null
const email = "laque-18@CorreoDePrueba123A.com"

describe(`AuthController {${url}}`, () => {
  beforeAll(async () => {
    await app.initApp()
    await app.createTokens(user)
  });

  
  describe(`{${url}/register, POST}`, () => {
    beforeAll(()=>{
      app.setUrl(`${url}/register`)
      app.setUseOfToken(false)
    })

    it(`Should return a 409 if email is registered`, async () => {
      const response = await app.postObject({
        email: user.email,
        cellphone: "0999999999",
        country: "country",
        firstName: "firstName",
        lastName: "lastname",
        city: "city",
        password: "Password123!",
        userName: "userName",
        birthday: new Date('1992-06-16')
      })
      
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe('Email already linked to an account');
    });

    it(`Should return a 409 if username is registered`, async () => {
      const response = await app.postObject({
        email: "wheikduwia@google.com",
        cellphone: "0999999999",
        country: "country",
        firstName: "firstName",
        lastName: "lastname",
        city: "city",
        password: "Password123!",
        userName: user.userName,
        birthday: new Date('1992-06-16')
      })
      
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe('Username already linked to an account');
    });

    it(`Should return a 400 if null data is sent`, async () => {
      const response = await app.postObject({})
      
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        'Email must be a valid email address',
        'Email is required',
        'Password must include uppercase, lowercase, numbers and special characters',
        'Password must be at least 12 characters long',
        'Password must be a string',
        'Password is required',
        'First name must be a string',
        'First name is required',
        'Last name must be a string',
        'Last name is required',
        'Cellphone must be a string',
        'Cellphone is required',
        'Country must be a string',
        'Country is required'
      ]);
    });

    it(`Should return a 400 if invalid data is sent`, async () => {
      const response = await app.postObject({
        email: "a",
        cellphone: 0,
        country: 0,
        firstName: 0,
        lastName: 0,
        city: 0,
        password: "short",
        userName: 0,
        birthday: "bad date",
        role: 0,
        job: 0,
        department: 0,
        type:0 ,
      })

      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        'Email must be a valid email address',
        'Password must include uppercase, lowercase, numbers and special characters',
        'Password must be at least 12 characters long',
        'First name must be a string',
        'Last name must be a string',
        'Cellphone must be a string',
        'Country must be a string',
        'City must be a string',
        'Username must be a string',
        'Birthday must be a valid date',
        'Role must be a string',
        'Job must be a string',
        'Department must be a string',
        'Type must be a string'
      ]);
    });

    it(`Should return a 201 if all fields are valid`, async () => {
      const response = await app.postObject({
        email: "test_Spec_201@google.com",
        cellphone: "099853218",
        country: "Ecuador",
        firstName: "Alexandro",
        lastName: "Zaharie",
        city: "Guayaquil",
        password: "Password123!",
        userName: "AlexZ_test_Spec_201",
        birthday: new Date('1992-01-27'),
        type: "Emprendedor"
      })
      
      expect(response.status).toBe(201);
      expect(response.body["response_encrypted"]["message"]).toBe('User registered successfully');
      userId = response.body["response_encrypted"]["userId"]
      await app.esperar(2000);
    });
  });


  describe(`{${url}/login, POST}`, () => {
    beforeAll(() => { app.setUrl(`${url}/login`) })

    it(`Should return a 200 if user login`, async () => {
      const response = await app.postObject({
        email: user.email,
        password: user.password,
      })
      expect(response.status).toBe(200);
    });

    it(`Should return a 401 if password is incorrect`, async () => {
      const response = await app.postObject({
        email: user.email,
        password: "Password321!",
      })
      expect(response.status).toBe(401);
      expect(response.body["message"]).toBe('Invalid credentials');
    });

    it(`Should return a 401 if email doesn't exist`, async () => {
      const response = await app.postObject({
        email: "notRegistered@google.com",
        password: "Password123!",
      })
      expect(response.status).toBe(401);
      expect(response.body["message"]).toBe('Email not registered');
    });
  });


  // describe(`{${url}/logout, POST}`, () => {
  //   afterEach(() => {
  //     jest.clearAllMocks();
  //   });

  //   it(`Should return a 200 if user logout`, async () => {
  //     const req = { cookies: { 'REFRESH-TOKEN': user.refreshToken } };
  //     const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), clearCookie: jest.fn(), } as any;

  //     await app.getApp().get(AuthController).logout(req as any, res);
  //     expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  //     expect(res.json).toHaveBeenCalledWith({ message: 'Sesión cerrada correctamente' });
  //   });

  //   it(`Should return a 401 token is null`, async () => {
  //     const req = { cookies: {'REFRESH-TOKEN': null} };
  //     const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), clearCookie: jest.fn(), } as any;

  //     await app.getApp().get(AuthController).logout(req as any, res);
  //     expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  //     expect(res.json).toHaveBeenCalledWith({ message: 'No hay token de refresco' });
  //   });

  //   it(`Should return a 401 token is invalid`, async () => {
  //     const req = { cookies: {'REFRESH-TOKEN': "invalidToken"} };
  //     const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), clearCookie: jest.fn(), } as any;

  //     await app.getApp().get(AuthController).logout(req as any, res);
  //     expect(res.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  //     expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido o expirado' });
  //     await app.esperar(2000);
  //   });
  // });


  describe(`{${url}/change-password, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/change-password`)
      app.setUseOfToken(true)
      app.setTokens(user)
    })

    it(`Should return a 201 if password was updated successfully`, async () => {
      const response = await app.postObject({ password: "Password123!", })

      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Password updated successfully')
    });

    it(`Should return a 400 if password is null`, async () => {
      const response = await app.postObject({})
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'Password must include uppercase, lowercase, numbers and special characters',
        'password must be a string',
        'password should not be empty'
      ])
    });

    it(`Should return a 400 if password is invalid`, async () => {
      const response = await app.postObject({ password: "short" })
      
      expect(response.status).toBe(400)
      expect(response.body["message"][0]).toBe('Password must include uppercase, lowercase, numbers and special characters')
    });
  });


  describe(`{${url}/send-verification-code, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/send-verification-code`)
      app.setUseOfToken(false)
    })

    // it(`Should return a 201 if verification code was sent successfully`, async () => {
    //   const response = await app.postObject({
    //     email,
    //     name: "Luis",
    //     reason: "registrarte"
    //   })
    //   expect(response.status).toBe(201)
    //   expect(response.body["encryptedResponse"]["message"]).toBe('Verification code sent successfully')
    // });

    it(`Should return a 400 if an invalid email was send`, async () => {
      const response = await app.postObject({
        email: "not a email",
        name: "Luis",
        reason: "registrarte"
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual(['email must be an email'])
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        email: 0,
        name: 0,
        reason: 0
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'email must be an email',
        'name must be a string',
        'reason must be a string'
      ])
    });
  });


  describe(`{${url}/verify-code, POST}`, () => {
    beforeAll(async () => {
      app.setUrl(`${url}/verify-code`)
      const data = await app.getPrisma().verificationCode.findFirst({where:{ email }})
      if(data){
        verifyCode = data.code
      }else{
        await app.getPrisma().verificationCode.upsert({
          where: { email },
          update: {
            code: "111111",
            expiresAt: new Date(),
          },
          create: {
            email,
            code: "111111",
            expiresAt: new Date(),
          },
        })
        verifyCode = "111111"
      }
      
      await app.getPrisma().verificationCode.upsert({
        where: { email: "test_Spec_400@authentificationemail.com" },
        update: {
          code: "111111",
          expiresAt: new Date('2025-03-01'),
        },
        create: {
          email: "test_Spec_400@authentificationemail.com",
          code: "111111",
          expiresAt: new Date('2025-03-01'),
        },
      })
    })

    // it(`Should return a 409 if the code is invalid`, async () => {
    //   const response = await app.postObject({
    //     email,
    //     code: "falseCode",
    //   })
    //   expect(response.status).toBe(409)
    //   expect(response.body["message"]).toBe('Invalid code')
    // });

    // it(`Should return a 201 if code was verified successfully`, async () => {
    //   const response = await app.postObject({
    //     email,
    //     code: verifyCode,
    //   })
    //   expect(response.status).toBe(201)
    //   expect(response.body["encryptedResponse"]["message"]).toBe('Code verified successfully')
    // });

    it(`Should return a 404 if email doesn't have a verification code`, async () => {
      const response = await app.postObject({
        email: "false@email.com",
        code: verifyCode,
      })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe('No verification code found')
    });

    it(`Should return a 400 if an invalid email was send`, async () => {
      const response = await app.postObject({
        email: "not a email",
        code: "111111",
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual(['email must be an email'])
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        email: 0,
        code: 0,
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'email must be an email',
        'code must be a string',
      ])
    });

    it(`Should return a 400 if code has expire`, async () => {
      const response = await app.postObject({
        email: "test_Spec_400@authentificationemail.com",
        code: "111111",
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe('Code has expired')
    });
  });
  

  afterAll(async () => {
    if(userId){
      await app.getPrisma().setting.deleteMany({where: {userId}})
      await app.getPrisma().user.delete({where: {id: userId}})
      await storageService.deleteBucket(userId)
    }
    await app.closeApp();
  });
});
