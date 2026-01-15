import { PlanController } from '../src/modules/plan/plan.controller';
import { PlanService } from '../src/modules/plan/plan.service';
import { testingModule } from './testing.module';

const url = '/plans';
const app = new testingModule()

let planId = null

describe(`PlanController {${url}}`, () => {
  beforeAll(async () => {
    await app.createApp(PlanController, PlanService)
    app.setUrl(url)
    app.setUseOfToken(false)
  })


  describe(`{${url}, POST}`, () => {
    it(`Should return a 201 if the plan's data are valid`, async () => {
      const response = await app.postObject({
        name: "test_Spec_201",
        description: "description",
        maxUsers: 50,
      })

      expect(response.status).toBe(201)
      expect(response.body["encryptedResponse"]["message"]).toBe('Plan created successfully')
      planId = response.body["encryptedResponse"]["plan"].id
    });

    it(`Should return a 409 if plan's name already exist`, async () => {
      const response = await app.postObject({
        name: "test_Spec_201",
        description: "description",
        maxUsers: 50,
      })

      expect(response.status).toBe(409)
      expect(response.body["message"]).toBe(`A plan with name 'test_Spec_201' already exists`)
    });

    it(`Should return a 400 if the plan's data are invalid`, async () => {
      const response = await app.postObject({
        name: 0,
        description: 0,
        maxUsers: "50",
      })
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'name must be a string',
        'description must be a string',
        'Number of users must be an integer'
      ])
    });

    it(`Should return a 400 if the plan's data is null`, async () => {
      const response = await app.postObject({})
      
      expect(response.status).toBe(400)
      expect(response.body["message"]).toEqual([
        'name must be a string',
        'Plan name is required',
        'description must be a string',
        'Plan description is required'
      ])
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it returns all the plans`, async () => {
      await app.goodGetWithUrl(url)
    });
  })


  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it returns the plan with id ${planId}`, async () => {
      const response = await app.getWithUrl(`${url}/${planId}`)
      expect(response.status).toBe(200)
      
      expect(response.body["encryptedResponse"].id).toBe(planId)
    });

    it(`Should return a 404 if plan doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/falseId`)

      expect(response.status).toBe(404)
      expect(response.body["message"]).toBe(`Plan with ID falseId not found`)
    });
  })


  afterAll(async () => {
    if(planId){
      await app.getPrisma().plan.delete({ where:{id: planId} })
    }
    await app.closeApp()
  })
})
