import { CompanyDepartmentController } from '../src/modules/company-department/company-department.controller';
import { CompanyDepartmentService } from '../src/modules/company-department/company-department.service';
import { testingModule } from './testing.module';

const url = `/companies/:companyId/departments`;
const app = new testingModule()

const companyId = "cmabdpj6f00017ktosok8trdm" //Company of user
const urlWithId = `/companies/${companyId}/departments`;

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

let departmentId = null
let userDepartmentId = null
const userId = `cm98rxi8l00017kikbrhvi0wa` //Id of the user to invitate.

const create = {
  name: "test departamento 201",
  icon: "default-department-icon",
}

describe(`CompanyDepartmentController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(CompanyDepartmentController, CompanyDepartmentService)
    await app.createTokens(user)
    app.setUrl(urlWithId)
    app.setTokens(user)
  })

  
  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if department was registered successfully`, async () => {
      const response = await app.postObject( create )
      expect(response.status).toBe(201)
      expect(response.body["message"]).toBe('Department registered successfully')
      departmentId = response.body["department"].id
    });

    it(`Should return a 409 if department already exist`, async () => {
      const response = await app.postObject( create )
      
      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`'${create.name}' is already a department of company ID: '${companyId}'`)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'name must be a string',
        'name should not be empty',
        'icon must be a string',
        'icon should not be empty'
      ])
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({
        name: 0,
        icon: 0,
      })
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'name must be a string',
        'icon must be a string',
      ])
    });

    it(`Should return a 404 if company doesn't exist`, async () => {
      app.setUrl(`/companies/falseId/departments`)
      const response = await app.postObject( create )
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Company with id falseId not found`)
    });
  })


  describe(`{${url}/:departmentId/users, GET}`, () => {
    it(`Should return a 200 if it return all the users of a department`, async () => {
      app.setUrl(`${urlWithId}/${departmentId}/users`)
      const response = await app.getWithToken()

      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if company doesn't have departments`, async () => {
      app.setUrl(`${urlWithId}/falseId/users`)
      const response = await app.getWithToken()
      
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Department with id falseId not found`)
    });
  })
  

  describe(`{${url}/:departmentId/users, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${urlWithId}/${departmentId}/users`)
    })

    it(`Should return a 201 if the user was added successfully`, async () => {
      const response = await app.postObject({ departmentId, userId })
      
      expect(response.status).toBe(201)
      expect(response.body["message"]).toBe('User added to department successfully')
      userDepartmentId = response.body["userDepartment"].id
    });

    it(`Should return a 409 if user was already added`, async () => {
      const response = await app.postObject({ departmentId, userId })

      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`User with ID: '${userId}' is already a member of department ID: '${departmentId}'`)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({ })
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'departmentId should not be empty',
        'departmentId must be a string',
        'userId should not be empty',
        'userId must be a string'
      ])
    });

    it(`Should return a 404 if user doesn't exist`, async () => {
      const response = await app.postObject({ 
        departmentId,
        userId: "falseId"
      })

      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User with ID: 'falseId' not found`)
    });

    it(`Should return a 404 if department doesn't exist`, async () => {
      app.setUrl(`${urlWithId}/falseId/users`)
      const response = await app.postObject({ departmentId, userId })

      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Department with ID: 'falseId' not found`)
    });
  })


  afterAll(async () => {
    if(userDepartmentId){
      await app.getPrisma().userDepartment.delete({ where: { id: userDepartmentId } })
    }
    if(departmentId){
      await app.getPrisma().companyDepartment.delete({ where: { id: departmentId } })
    }
    
    await app.closeApp()
  })
})
