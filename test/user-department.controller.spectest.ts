import { UserDepartmentController } from '../src/modules/user-department/user-department.controller';
import { UserDepartmentService } from '../src/modules/user-department/user-department.service';
import { testingModule } from './testing.module';

const url = `/departments/:departmentId/users`
const app = new testingModule()

const companyId = "cmabdpj6f00017ktosok8trdm" 
let departmentId = ``
let urlWithId = `/departments/${departmentId}/users`

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

const userId = `cm98rxi8l00017kikbrhvi0wa`
let removeId = null

describe(`UserDepartmentController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(UserDepartmentController, UserDepartmentService)
    await app.createTokens(user)
    app.setTokens(user)
  })

  
  describe(`{${url}, POST}`, () => {
    beforeAll(async ()=>{
      const data = await app.getPrisma().companyDepartment.create({
        data: {
          companyId,
          name: 'UserDepartmentController',
          icon: 'default-department-icon'
        }
      })
      if(data){
        departmentId = data.id
        urlWithId = `/departments/${departmentId}/users`
      }
      app.setUrl(urlWithId)
    })

    it(`Should return a 201 if user was added to department successfully`, async () => {
      const response = await app.postObject({
        departmentId,
        userId,
      })
      
      expect(response.status).toBe(201)
      expect(response.body["message"]).toBe('User added to department successfully')
      removeId = response.body["userDepartment"].id
    });

    it(`Should return a 409 if user was already registed`, async () => {
      const response = await app.postObject({
        departmentId,
        userId,
      })
      
      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`User with ID: '${userId}' is already a member of department ID: '${departmentId}'`)
    });

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject({})
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe("User ID is required")
    });

    it(`Should return a 400 if data are invalid`, async () => {
      const response = await app.postObject({
        name: 0,
        icon: 0,
      })
      expect(response.status).toBe(400)
      expect(response.body["message"]).toBe("User ID is required")
    });

    it(`Should return a 404 if user doesn't exist`, async () => {
      const response = await app.postObject({
        departmentId,
        userId: "falseId",
      })
      
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`User with ID: 'falseId' not found`)
    });

    it(`Should return a 404 if department doesn't exist`, async () => {
      app.setUrl("/departments/falseId/users")
      const response = await app.postObject({
        departmentId,
        userId,
      })
      
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Department with ID: 'falseId' not found`)
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return all the users of a department`, async () => {
      app.setUrl(urlWithId)
      const response = await app.getWithToken()
      
      expect(response.status).toBe(200)
    });

    it(`Should return a 404 if department doesn't exist`, async () => {
      app.setUrl(`/departments/falseId/users`)
      const response = await app.getWithToken()
      
      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Department with id falseId not found`)
    });
  })


  afterAll(async () => {
    if(removeId){
      await app.getPrisma().userDepartment.delete({ where: { id: removeId } })
    }
    if(departmentId){
      await app.getPrisma().companyDepartment.delete({ where: { id: departmentId } })
    }
    await app.closeApp()
  })
})
