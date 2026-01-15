import { ProductController } from '../src/modules/product/product.controller';
import { ProductService } from '../src/modules/product/product.service';
import { testingModule } from './testing.module';

const url = "/products";
const app = new testingModule()

let user = {
  sub: 'cm95y3jnn00007kvgke4tze0a',
  email: 'LQcorreo@google.com',
  accessToken: "",
  refreshToken: "",
}

const nullCompany = {
  sub: 'cm98rxi8l00017kikbrhvi0wa',
  email: 'multicuenta_Quezada2@google.com',
  accessToken: "",
  refreshToken: "",
}

const product = "Queso"
let productId = ''

describe('ProductController', () => {
  beforeAll(async () => {
    await app.createApp(ProductController, ProductService)
    await app.createTokens(user)
    await app.createTokens(nullCompany)
    app.setUrl(url)
    app.setTokens(user)
  });


  describe(`{${url}, POST}`, () => {
    beforeAll( () => {
      app.setUrl(`${url}/create`)
    })
    
    it(`Should return a 201 if the data is valid`, async () => {
      const response = await app.postObject({
        userId: user.sub,
        product 
      })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Product created successfully');
      productId = response.body["encryptedResponse"]["newProduct"].id
    });

    it(`Should return a 409 if product already exist in user's company`, async () => {
      const response = await app.postObject({
        userId: user.sub,
        product 
      })
      expect(response.status).toBe(409);
      expect(response.body["message"]).toBe(`A product with name '${product}' already exists in user's company`);
    });

    it(`Should return a 400 if product is null`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400);
      expect(response.body["message"]).toEqual([
        "userId must be a string",
        "User ID is required",
        "product must be a string",
        "Product name is required"
      ]);
    });

    it(`Should return a 400 if user don't have a company`, async () => {
      const response = await app.postObject({
        userId: nullCompany.sub,
        product 
      })
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe(`User with ID ${nullCompany.sub} does not have a company`);
    });
  });


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it return all the products`, async () => {
      await app.goodGetWithUrl(url)
    });
  })
  

  describe(`{${url}/:id, GET}`, () => {
    it(`Should return a 200 if it return the product`, async () => {
      const response = await app.getWithUrl(`${url}/${productId}`)
      expect(response.status).toBe(200);
      expect(response.body["encryptedResponse"].id).toBe(productId);
    });

    it(`Should return a 404 if product doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/falseId`)
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Product with ID falseId not found`);
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/update/${productId}`)
    })

    it(`Should return a 201 if product was updated successfully`, async () => {
      const response = await app.postObject({ product: "Papas" })
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Product updated successfully');
    });

    it(`Should return a 400 if data is invalid`, async () => {
      const response = await app.postObject({ product: 0 })
      expect(response.status).toBe(400);
      expect(response.body["message"][0]).toBe(`product must be a string`);
    });

    it(`Should return a 400 if product was send as null`, async () => {
      const response = await app.postObject({ product: null })
      expect(response.status).toBe(400);
      expect(response.body["message"]).toBe(`Product can't be send as null`);
    });

    it(`Should return a 404 if product doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.postObject({ product: "falseId" })
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Product with ID falseId not found`);
    });
  })


  describe(`{${url}/delete/:id, POST}`, () => {
    beforeAll(() => {
      app.setUrl(`${url}/delete/${productId}`)
    })

    it(`Should return a 201 if product was deleted successfully`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(201);
      expect(response.body["encryptedResponse"]["message"]).toBe('Product deleted successfully');
    });

    it(`Should return a 404 if product doesn't exist`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(404);
      expect(response.body["message"]).toBe(`Product with ID ${productId} not found`);
    });
  })


  afterAll(async () => {
    await app.closeApp();
  });
});