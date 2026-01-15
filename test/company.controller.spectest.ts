import { CompanyController } from '../src/modules/company/company.controller';
import { CompanyService } from '../src/modules/company/company.service';
import { testingModule } from './testing.module';

const url = '/companies'
const app = new testingModule()

let user = {
  sub: 'cm98rxcsa00007kikjhvitzh3',
  email: 'multicuenta_Quezada1@google.com',
  companyId: "",
  accessToken: "",
  refreshToken: "",
}

let guest = {
  firstName: "Luis2",
  lastName: "Quezada2",
  email: "multicuenta_Quezada2@google.com",
  job: "Ingenieria en alimentos",
}

const otherCompanyId = 'cmabdpj6f00017ktosok8trdm'
let departmentId = ''
let userAddedId = ''

describe(`CompanyController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(CompanyController, CompanyService)
    await app.createTokens(user)
  })


  describe(`{${url}/create, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/create`)
      app.setUseOfToken(false)
    })

    it(`Should return a 201 if the entrepeneur's data are valid`, async () => {
      const response = await app.postObject({
        userId: user.sub,
        name: "test_Spec_201 Emprendedor",
        size: "1-5 empleados"
      })
      
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Company created successfully');
      user.companyId = response.body["encryptedResponse"]["company"].id
    });

    it(`Should return a 409 if user already have a company`, async () => {
      const response = await app.postObject({
        userId: user.sub,
        name: 'Quesos Quezada',
        size: '1-5 empleados',
      })

      expect(response.status).toBe(409)
      expect(response.body['message']).toBe('This company already exists')
    })

    it(`Should return a 400 if invalid data is sent`, async () => {
      const response = await app.postObject({
        userId: 0,
        name: 0,
        companyName: 0,
        matrixAddress: 0,
        taxId: 0,
        size: 0,
        country: 0,
      })

      expect(response.status).toBe(400)
      expect(response.body['message']).toEqual([
        "userId must be a string",
        'name must be a string',
        'companyName must be a string',
        'taxId must be a string',
        'size must be a string',
        'country must be a string',
      ])
    })

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})

      expect(response.status).toBe(400)
      expect(response.body['message']).toEqual([
        'userId must be a string',
        'userId is required',
        'name must be a string',
        'Company name is required',
        'size must be a string',
        'Company size is required',
      ])
    })
  })


  describe(`{${url}/all, GET}`, () => {
    it(`Should return a 200 if it returns all the companies`, async () => {
      await app.goodGetWithUrl(`${url}/all`)
    });
  })
  

  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it returns company with id ${user.companyId}`, async () => {
      const response = await app.getWithUrl(`${url}/${user.companyId}`)

      expect(response.status).toBe(200)
      expect(response.body["encryptedResponse"].id).toBe(user.companyId)
    });

    it(`Should return a 404 if company doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/falseId`)

      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe("Company with id falseId not found")
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl((`${url}/update/${user.companyId}`))
      app.setUseOfToken(true)
      app.setTokens(user)
    })

    it(`Should return a 201 if it updates companyName`, async () => {
      const response = await app.postObject({ companyName: "Quesos S.A." })

      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Company updated successfully')
      expect(response.body["encryptedResponse"]["company"].id).toBe(user.companyId)
    });

    it(`Should return a 201 if it updates the company data`, async () => {
      const response = await app.postObject({
        name: "Quesos Quezada",
        companyName: "Quesos S.A.",
        matrixDirection: "Zona X mz 11 04",
        taxId: "siefnsi3ed982uher",
        size: "1-5 empleados",
        country: "Ecuador",
        city: "Guayaquil",
      })

      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Company updated successfully')
      expect(response.body["encryptedResponse"]["company"].id).toBe(user.companyId)
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({
        name: 0,
        companyName: 0,
        matrixDirection: 0,
        taxId: 0,
        size: 0,
        country: 0,
        city: 0,
      })

      expect(response.status).toBe(400)
      expect(response.body['message']).toEqual([
        'name must be a string',
        'companyName must be a string',
        'matrixDirection must be a string',
        'taxId must be a string',
        'size must be a string',
        'country must be a string',
        'city must be a string'
      ])

    });

    it(`Should return a 400 if name is send as null`, async () => {
      const response = await app.postObject({ name: null })
      
      expect(response.status).toBe(400)
      expect(response.body['message']).toBe("Name can't be send as null")
    });

    it(`Should return a 400 if size is send as null`, async () => {
      const response = await app.postObject({ size: null })

      expect(response.status).toBe(400)
      expect(response.body['message']).toBe("Size can't be send as null")
    });

    it(`Should return a 404 if company doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.postObject({ companyName: "Quesos S.A." })

      expect(response.status).toBe(404)
      expect(response.body['message']).toBe("Company not found")
    });

    it(`Should return a 403 if company doesn't belongs to user`, async () => {
      app.setUrl(`${url}/update/${otherCompanyId}`)
      const response = await app.postObject({ name: "TestCorp S.A." })

      expect(response.status).toBe(403)
      expect(response.body['message']).toBe("You do not have permission to update this company")
    });
  })


  describe(`{${url}/:id/users, GET}`, () => {
    it(`Should return a 200 if it returns all the users of a company`, async () => {
      app.setUrl(`${url}/${user.companyId}/users`)
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if company doesn't exist`, async () => {
      app.setUrl(`${url}/falseId/users`)
      const response = await app.getWithToken()
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe("Company with id falseId not found")
    });
  })


  describe(`{${url}/:id/departments/users, GET}`, () => {
    beforeAll(() => {app.setTokens(user)})

    it(`Should return a 200 if it returns all the departmens with the users of a company`, async () => {
      app.setUrl(`${url}/${user.companyId}/departments/users`)
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if company doesn't exist`, async () => {
      app.setUrl(`${url}/falseId/departments/users`)
      const response = await app.getWithToken()

      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe("Company with id falseId not found")
    });
  })


  describe(`{${url}/:companyId/add-user, POST}`, () => {
    beforeAll( async () => {
      app.setUrl(`${url}/${user.companyId}/add-user`)
      app.setTokens(user)
      if(user.companyId){
        const data = await app.getPrisma().companyDepartment.create({
          data: {
            icon: 'default-department-icon',
            name: 'departamento',
            companyId: user.companyId
          }
        })
        if(data){
          departmentId = data.id
        }
      }
    })

    it(`Should return a 201 if user was added to the company`, async () => {
      const response = await app.postObject({
        ...guest,
        departmentId,
      })

      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('User added to company successfully')
      userAddedId = response.body["encryptedResponse"]["userDepartment"].id
    });

    it(`Should return a 409 if user was alredy added to a department of the company`, async () => {
      const response = await app.postObject({
        ...guest,
        departmentId,
      })
      expect(response.status).toBe(409)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
    });

    it(`Should return a 404 if the email isn't registred`, async () => {
      const response = await app.postObject({
        firstName: "Juan",
        lastName: "Guerra",
        email: "falseEmail",
        departmentId,
        job: "Ingenieria en alimentos",
      })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe('User with this email does not exist')
    });

    it(`Should return a 404 if department doesn't exist`, async () => {
      const response = await app.postObject({
        ...guest,
        departmentId: "falseId",
      })
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe('Department with id falseId not found')
    });
    
    it(`Should return a 403 if user doesn't have permision to add user in company`, async () => {
      app.setUrl(`${url}/${otherCompanyId}/add-user`)
      const response = await app.postObject({
        ...guest,
        departmentId,
      })
      expect(response.status).toBe(403)
      expect(response.body["message"]).toBe('You do not have permission to add users to this company')
    });

    afterAll(async () => {
      if(userAddedId){
        await app.getPrisma().userDepartment.delete({ where: { id: userAddedId } })
      }
      if(departmentId){
        await app.getPrisma().companyDepartment.delete({ where: { id: departmentId}})
      }
    })
  })


  afterAll(async () => {
    if(user.companyId){
      await app.getPrisma().company.delete({ where: { id: user.companyId } })
    }
    await app.closeApp()
  })
})
