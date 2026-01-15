import { FileController } from '../src/modules/project/file/file.controller';
import { FileService } from '../src/modules/project/file/file.service';
//import { CollaboratorService } from '../src/modules/project/collaborator/collaborator.service';
import { testingModule } from './testing.module';

const url = '/files';
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

// let user3 = {
//   sub: 'cm98rxi8l00017kikbrhvi0wa',
//   email: 'multicuenta_Quezada2@google.com',
//   accessToken: "",
//   refreshToken: "",
// }

let fileId = ''
let copyId = ''
let userFileId = ''

describe(`FileController {${url}}`, () => {
  beforeAll(async () => {
    //app.addProvider(CollaboratorService)
    await app.createApp(FileController, FileService)
    await app.createTokens(user)
    await app.createTokens(user2)
    //await app.createTokens(user3)
  })
  

  describe(`{${url}, POST}`, () => {
    beforeAll( () => {
      app.setUrl(url)
      app.setTokens(user)
    })

    it(`Should return a 201 if the file's data are valid`, async () => {
      const response = await app.postObject({
        projectId: "ihrw43gt7uw34gti4",
        name: "Prueba spec 201",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(201)
      fileId = response.body["encryptedResponse"]["file"].id
    });

    it(`Should return a 400 if file's name contains only spaces`, async () => {
      const response = await app.postObject({
        projectId: "ihrw43gt7uw34gti4",
        name: "  ",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if file's name contains any of this character: \\/:*?"<>|`, async () => {
      const response = await app.postObject({
        projectId: "ihrw43gt7uw34gti4",
        name: "as:*",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if the file's name is a reserved word of windows`, async () => {
      const response = await app.postObject({
        folderId: 'cm9w6keeh00017kb8frxkht7h',
        projectId: "ihrw43gt7uw34gti4",
        name: "aUx",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if file's name contains more than 210 characters`, async () => {
      const response = await app.postObject({
        projectId: "ihrw43gt7uw34gti4",
        name: "fkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkqw",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if the file's data are invalid`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if type doesn't exist`, async () => {
      const response = await app.postObject({
        projectId: "y273ye8238e632tr",
        name: "Spect test 400",
        url: "https://www.google.com.ec/?hl=es",
        type: "INEXISTENTE",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 404 if folder doesn't exist`, async () => {
      const response = await app.postObject({
        folderId: "falseId",
        projectId: "y273ye8238e632tr",
        name: "Spect test 404",
        url: "https://www.google.com.ec/?hl=es",
        type: "Etiqueta",
      })
      expect(response.status).toBe(404)
    });
  })


  describe(`{${url}/duplicate, POST}`, () => {
    beforeAll( () => {
      app.setUrl(`${url}/duplicate`)
      app.setTokens(user)
    })

    it(`Should return a 400 if data is null`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });

    it(`Should return a 201 if file was duplicated successfully`, async () => {
      const response = await app.postObject({
        fileId,
      })
      expect(response.status).toBe(201)
      copyId = response.body["encryptedResponse"]["copyFile"].id
    });

    it(`Should return a 404 if folder is not found`, async () => {
      const response = await app.postObject({
        fileId,
        folderId: 'falseId'
      })
      expect(response.status).toBe(404)
    });

    it(`Should return a 403 if user doesn't count with access to the file`, async () => {
      const response = await app.postObject({
        fileId: 'falseId',
      })
      expect(response.status).toBe(403)
    });
  })


  // describe(`{${url}/collaborator, POST}`, () => {
  //   beforeAll(()=>{
  //     app.setUrl(`${url}/collaborator`)
  //     app.setTokens(user)
  //   })

  //   it(`Should return a 201 if the collaborator was added successfully`, async () => {
  //     const response = await app.postObject({
  //       fileId,
  //       collaboratorEmail: user3.email,
  //       accessType: "read",
  //     })
  //     expect(response.status).toBe(201)
  //     userFileId = response.body["encryptedResponse"]["userFile"].id
  //   });

  //   it(`Should return a 409 if the user already have permissions`, async () => {
  //     const response = await app.postObject({
  //       fileId,
  //       collaboratorEmail: user3.email,
  //       accessType: "read",
  //     })
  //     expect(response.status).toBe(409)
  //   });

  //   it(`Should return a 404 if user with email doesn't exist false@email.com`, async () => {
  //     const response = await app.postObject({
  //       fileId,
  //       collaboratorEmail: "false@email.com",
  //       accessType: "write",
  //     })
  //     expect(response.status).toBe(404)
  //   });

  //   it(`Should return a 404 if file doesn't exist`, async () => {
  //     const response = await app.postObject({
  //       fileId: "falseId",
  //       collaboratorEmail: user3.email,
  //       accessType: "write",
  //     })
  //     expect(response.status).toBe(404)
  //   });

  //   it(`Should return a 403 if user doesn't count with permissions to add others collaborators`, async () => {
  //     app.setTokens(user2)
  //     const response = await app.postObject({
  //       fileId,
  //       collaboratorEmail: user3.email,
  //       accessType: "read",
  //     })
  //     expect(response.status).toBe(403)
  //   });
  // })


  describe(`{${url}/fileBin/:id, POST}`, () => {
    beforeAll( () => {
      app.setUrl(`${url}/fileBin/${fileId}`)
    })

    it(`Should return a 403 if user doesn't count with permissions to erased the file`, async () => {
      app.setTokens(user2)
      const response = await app.postObject()
      expect(response.status).toBe(403)
    });

    it(`Should return a 201 if the file bin was created suceccessfully`, async () => {
      app.setTokens(user)
      const response = await app.postObject()
      expect(response.status).toBe(201)
    });

    it(`Should return a 404 if the file isn't found`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(404)
    });
  })


  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it returns all the files`, async () => {
      await app.goodGetWithUrl(url)
    });
  })


  describe(`{${url}/data/:id, GET}`, () => {
    it(`Should return a 200 if it returns the file`, async () => {
      await app.goodGetWithUrl(`${url}/data/${fileId}`)
    });

    it(`Should return a 404 if file does't exist`, async () => {
      const response = await app.getWithUrl(`${url}/data/idfalse`)
      expect(response.status).toBe(404)
    });
  })


  // describe(`{${url}/download/cm98qll4f00017kwc34kef8wn, GET}`, () => {
  //   it(`Should return a 200 if it returns the file`, async () => {
  //     const response = await app.getWithUrl(`${url}/download/cm98qll4f00017kwc34kef8wn`)
  //     console.log(response.text)
  //   });
  // })


  describe(`{${url}/of_user, GET}`, () => {
    beforeAll(()=>{
      app.setUrl(`${url}/of_user`)
      app.setTokens(user)
    })

    it(`Should return a 200 if it returns all the files of the user`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(()=>{
      app.setParameters(`${url}/update/${fileId}`, true)
    })

    it(`Should return a 403 if user doesn't count with permission to update the file`, async () => {
      app.setTokens(user2)
      const response = await app.postObject({
        name: "Actualizado"
      })
      expect(response.status).toBe(403)
    });

    it(`Should return a 201 if file updated successfully`, async () => {
      app.setTokens(user)
      const response = await app.postObject({
        name: "Actualizate"
      })
      expect(response.status).toBe(201)
    });

    it(`Should return a 404 if folder doesn't exist`, async () => {
      const response = await app.postObject({
        moveToId: 'falseId',
        name: "carpeta inexistente"
      })
      expect(response.status).toBe(404)
    });
  })


  // describe(`{${url}/update_collaborator, POST}`, () => {
  //   beforeAll(()=>{
  //     app.setParameters(`${url}/update_collaborator`, false)
  //   })

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       userId: 'cm98rxcsa00007kikjhvitzh3',
  //       fileId: 'cm9n2twcs00017kks31h71l0u',
  //       accessType: "read",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       userId: 'cm95y3jnn00007kvgke4tze0a',
  //       fileId: 'cm9n2twcs00017kks31h71l0u',
  //       accessType: "owner",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       userId: 'cm98rxcsa00007kikjhvitzh3',
  //       fileId: 'cm9n2twcs00017kks31h71l0u',
  //       accessType: "owner",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(409)
  //   });

  //   it(`Should return a 404 if UserFolder doesn't exist`, async () => {
  //     app.setUrl(`${url}/update_collaborator`)
  //     const response = await app.postObject({
  //       userId: 'cm98rxcsa00007kikjhvitzh3',
  //       fileId: 'falseId',
  //       accessType: "write",
  //       openedAt: new Date(),
  //     })
  //     expect(response.status).toBe(404)
  //   });
  // })


  // describe(`{${url}/delete_collaborator/:id, POST}`, () => {
  //   beforeAll(()=>{
  //     app.setParameters(`${url}/delete_collaborator/${userFileId}`, false)
  //   })

  //   it(`Should return a 201 if collaborator was remove successfully`, async () => {
  //     const response = await app.postObject()
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 404 if UserFile doesn't exist`, async () => {
  //     const response = await app.postObject()
  //     expect(response.status).toBe(404)
  //   });
  // })


  describe(`{${url}/remove_from_bin/:id, POST}`, () => {
    beforeAll( () => {
      app.setParameters(`${url}/remove_from_bin/${fileId}`, true)
      app.setTokens(user)
    })

    it(`Should return a 201 if file was deleted successfully`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(201)
    });

    it(`Should return a 404 if file isn't in bin`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(404)
    });

    it(`Should return a 403 if user doesn't count with access to the file`, async () => {
      app.setUrl(`${url}/remove_from_bin/falseId`)
      const response = await app.postObject()
      expect(response.status).toBe(403)
    });
  })


  describe(`{${url}/delete/:id, POST}`, () => {
    beforeAll(async ()=>{
      app.setParameters(`${url}/delete/${fileId}`, true)
      app.setTokens(user)
      if(fileId){
        const existingFileBin = await app.getPrisma().fileBin.findFirst({
          where:{ fileId }
        })
        if(!existingFileBin){
          await app.getPrisma().fileBin.create({
            data: {
              fileId,
              removeBy: user.sub,
            },
          })
        }
      }
    })

    it(`Should return a 201 if file was deleted successfully`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(201)
    });

    it(`Should return a 403 if user doesn't have access to the file`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(403)
    });

    it(`Should return a 404 if file isn't in bin`, async () => {
      app.setUrl(`${url}/delete/${copyId}`)
      const response = await app.postObject()
      expect(response.status).toBe(404)
    });
  })
  

  afterAll(async () => {
    if(copyId){
      await app.getPrisma().userFile.deleteMany({
        where: { fileId: copyId }
      })

      await app.getPrisma().file.delete({
        where: { id: copyId }
      })
    }
    await app.closeApp()
  })
})
