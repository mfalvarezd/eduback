import { FolderController } from '../src/modules/project/folder/folder.controller';
import { FolderService } from '../src/modules/project/folder/folder.service';
//import { CollaboratorService } from '../src/modules/project/collaborator/collaborator.service';
import { testingModule } from './testing.module';

const url = '/folders';
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


let folderId = ''
let copyId = ''
let teamId = ''
// let sharedId = ''
// let userFolderId = ''

describe(`FolderController {${url}}`, () => {
  beforeAll(async () => {
    //app.addProvider(CollaboratorService)
    await app.createApp(FolderController, FolderService)
    await app.createTokens(user)
    await app.createTokens(user2)
    // await app.createTokens(user3)
  })

  
  describe(`{${url}, POST}`, () => {
    beforeAll( () => {
      app.setUrl(url)
      app.setTokens(user)
    })

    it(`Should return a 201 if the folder's data are valid`, async () => {
      const response = await app.postObject({
        name: "Post test spect 201",
      })
      expect(response.status).toBe(201)
      folderId = response.body["encryptedResponse"]["folder"].id
    });

    it(`Should return a 400 if folder's data are invalid`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if folder's name contains any of this character: \\/:*?"<>|`, async () => {
      const response = await app.postObject({ name: "/a?" })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if folder's name contains only spaces or periods`, async () => {
      const response = await app.postObject({ name: "." })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if folder's name is a reserved word name`, async () => {
      const response = await app.postObject({ name: "CON" })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if folder's name contains more than 210 characters`, async () => {
      const response = await app.postObject({
        name: "fkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkqw",
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 404 if folder doesn't exist`, async () => {
      const response = await app.postObject({
        folderId: "falseId",
        name: "404 NOT FOUND",
      })
      expect(response.status).toBe(404)
    });
  })


  describe(`{${url}/duplicate, POST}`, () => {
    beforeAll(()=>{
      app.setParameters(`${url}/duplicate`, true)
      app.setTokens(user)
    })

    it(`Should return a 201 if folder was duplicated successfully`, async () => {
      const response = await app.postObject({
        moveToId: null,
        foldersId: [folderId],
      })
      expect(response.status).toBe(201)
      copyId = response.body["encryptedResponse"]["userFolders"][0].id
    });

    it(`Should return a 400 if neither foldersId nor filesId were send`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });

    it(`Should return a 403 if user doesn't count with access to moveToId folder`, async () => {
      const response = await app.postObject({
        moveToId: 'falseId',
        foldersId: [folderId],
      })
      expect(response.status).toBe(403)
    });
  })


  // describe(`{${url}/update_accessType, POST}`, () => {
  //   beforeAll(()=>{
  //     app.setParameters(`${url}/update_accessType`, true)
  //   })

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       collaboratorId: user3.sub,
  //       accessType: "BORRAR",
  //       foldersId: ["cm9os3ie200017k9o6j69ml3o", "cm9os3n0e00057k9ocyhj6nru"],
  //       filesId: ["cm9ou8fjh00057kq0dy9habrt", "cm9ou8m4t00097kq0cjc1um99"],
  //     })
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 404 if UserFolder doesn't exist`, async () => {
  //     const response = await app.postObject()
  //     expect(response.status).toBe(400)
  //   });

  //   it(`Should return a 404 if UserFolder doesn't exist`, async () => {
  //     const response = await app.postObject({
  //       collaboratorId: user3.sub,
  //       accessType: "owner",
  //       foldersId: ["cm9os3ie200017k9o6j69ml3o", "cm9os3n0e00057k9ocyhj6nru"],
  //       filesId: ["cm9ou8fjh00057kq0dy9habrt", "cm9ou8m4t00097kq0cjc1um99"],
  //     })
  //     expect(response.status).toBe(409)
  //   });
  // })


  describe(`{${url}/teams, POST}`, () => {
    beforeAll(()=>{
      app.setParameters(`${url}/teams`, true)
      app.setTokens(user)
    })

    it(`Should return a 201 if the team's data are valid`, async () => {
      const response = await app.postObject({ name: "CON" })
      expect(response.status).toBe(201)
      teamId = response.body["encryptedResponse"]["folder"].id
    });

    it(`Should return a 400 if the team's data are invalid`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });

    it(`Should return a 403 if user isn't an administrador`, async () => {
      app.setTokens(user2)
      const response = await app.postObject({ name: "ERROR 403" })
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
  //       collaboratorEmail: user2.email,
  //       accessType: "read",
  //       foldersId: [teamId],
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if the collaborator was added successfully`, async () => {
  //     const response = await app.postObject({
  //       collaboratorEmail: user3.email,
  //       accessType: "NO DEBE MOSTRARSE",
  //       foldersId: ["cm9os3ie200017k9o6j69ml3o", "cm9os3n0e00057k9ocyhj6nru"],
  //       filesId: ["cm9ou8fjh00057kq0dy9habrt", "cm9ou8m4t00097kq0cjc1um99"],
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if the collaborator was added successfully`, async () => {
  //     const response = await app.postObject()
  //     console.log(response.text)
  //     expect(response.status).toBe(400)
  //   });
  // })


  describe(`{${url}/folderBin, POST}`, () => {
    beforeAll(()=>{
      app.setUrl(`${url}/folderBin`)
      app.setTokens(user)
    })

    it(`Should return a 201 if the folder bin was created suceccessfully`, async () => {
      const response = await app.postObject({ foldersId: [folderId] })
      expect(response.status).toBe(201)
    });

    it(`Should return a 400 if neither foldersId nor filesId were send`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });
  })
  
  
  describe(`{${url}, GET}`, () => {
    it(`Should return a 200 if it returns all the folders`, async () => {
      await app.goodGetWithUrl(url)
    });
  })


  describe(`{${url}/data/:id, GET}`, () => {
    it(`Should return a 200 if it returns the folder`, async () => {
      await app.goodGetWithUrl(`${url}/data/${folderId}`)
    });

    it(`Should return a 404 if folder doesn't exist`, async () => {
      const response = await app.getWithUrl(`${url}/data/idfalse`)
      expect(response.status).toBe(404)
    });
  })


  describe(`{${url}/of_user, GET}`, () => {
    beforeAll(()=>{
      app.setUrl(`${url}/of_user`)
      app.setTokens(user)
    })

    it(`Should return a 200 if it returns all the folders of the user`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });
  })


  describe(`{${url}/directory, GET}`, () => {
    beforeAll(()=>{
      app.setUrl(`${url}/directory`)
      app.setTokens(user)
    })

    it(`Should return a 200 if it returns all the folders and files of the user`, async () => {
      const response = await app.getWithToken()
      expect(response.status).toBe(200)
    });
  })


  describe(`{${url}/update/:id, POST}`, () => {
    beforeAll(()=>{
      app.setParameters(`${url}/update/${folderId}`, true)
      app.setTokens(user)
    })

    it(`Should return a 201 if folder updated successfully`, async () => {
      const response = await app.postObject({ name: "UPDATED 201" })
      expect(response.status).toBe(201)
    });

    it(`Should return a 400 if folder's name is invalid`, async () => {
      const response = await app.postObject({
        name: "fkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikewbfkiwebfewhbfwebfkweohiidbwedbweidbewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkiwbfbwehbfikeewifkiwbfkqw"
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if the folder's name contains any of this character: \\/:*?"<>|`, async () => {
      const response = await app.postObject({ name: "/a?" })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if the folder's name contains period or spaces`, async () => {
      const response = await app.postObject({ name: "." })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if the folder's name is a reserved word of windows`, async () => {
      const response = await app.postObject({ name: "CON" })
      expect(response.status).toBe(400)
    });

    it(`Should return a 400 if folder is sent as moveToId`, async () => {
      const response = await app.postObject({
        moveToId: folderId,
        name: "Folder can't be storage in itself"
      })
      expect(response.status).toBe(400)
    });

    it(`Should return a 404 if moveToId doesn't exist`, async () => {
      const response = await app.postObject({
        moveToId: 'falseId',
        name: "false moveToId"
      })
      expect(response.status).toBe(404)
    });

    it(`Should return a 404 if folder doesn't exist`, async () => {
      app.setUrl(`${url}/update/falseId`)
      const response = await app.postObject({
        moveToId: null,
        name: "folder doesn't exist"
      })
      expect(response.status).toBe(404)
    });
  })


  describe(`{${url}/teamsUpdate/:id, POST}`, () => {
    beforeAll(()=>{
      app.setParameters(`${url}/teamsUpdate/${teamId}`, true)
      app.setTokens(user)
    })

    it(`Should return a 201 if team updated successfully`, async () => {
      const response = await app.postObject({ name: "Team updated 201" })
      expect(response.status).toBe(201)
    });

    it(`Should return a 404 if team doesn't exist`, async () => {
      app.setUrl(`${url}/teamsUpdate/${folderId}`)
      const response = await app.postObject({ name: "ERROR 404" })
      expect(response.status).toBe(404)
    });

    it(`Should return a 403 if user doesn't count with permissions to modify the team`, async () => {
      app.setTokens(user2)
      const response = await app.postObject({ name: "ERROR 403" })
      expect(response.status).toBe(403)
    });
  })


  // describe(`{${url}/update_collaborator, POST}`, () => {
  //   beforeAll(()=>{
  //     folderId = 'cm9os3ie200017k9o6j69ml3o'
  //     app.setParameters(`${url}/update_collaborator`, false)
  //   })

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       userId: user3.sub,
  //       folderId,
  //       accessType: "write",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if folder updated successfully`, async () => {
  //     const response = await app.postObject({
  //       userId: user3.sub,
  //       folderId,
  //       accessType: "owner",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(409)
  //   });

  //   it(`Should return a 404 if UserFolder doesn't exist`, async () => {
  //     app.setUrl(`${url}/update_collaborator`)
  //     const response = await app.postObject({
  //       userId: user3.sub,
  //       folderId: 'falseId',
  //       accessType: "write",
  //       openedAt: new Date(),
  //     })
  //     console.log(response.text)
  //     expect(response.status).toBe(404)
  //   });
  // })


  // describe(`{${url}/delete_collaborator/:id, POST}`, () => {
  //   beforeAll(()=>{
  //     app.setParameters(`${url}/delete_collaborator`, true)
  //     app.setTokens(user)
  //   })

  //   it(`Should return a 201 if collaborator was remove successfully`, async () => {
  //     const response = await app.postObject({
  //       collaboratorId: user3.sub,
  //       foldersId: ["cm9os3ie200017k9o6j69ml3o", "cm9os3n0e00057k9ocyhj6nru"],
  //       filesId: ["cm9ou8fjh00057kq0dy9habrt", "cm9ou8m4t00097kq0cjc1um99"],
  //     })
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 201 if collaborator was remove successfully`, async () => {
  //     const response = await app.postObject()
  //     expect(response.status).toBe(201)
  //   });

  //   it(`Should return a 404 if UserFolder doesn't exist`, async () => {
  //     const response = await app.postObject({
  //       collaboratorId: user3.sub,
  //       foldersId: ["cm9os3ie200017k9o6j69ml3o", "cm9os3n0e00057k9ocyhj6nru"],
  //       filesId: ["cm9ou8fjh00057kq0dy9habrt", "cm9ou8m4t00097kq0cjc1um99"],
  //     })
  //     expect(response.status).toBe(404)
  //   });
  // })


  describe(`{${url}/remove_from_bin, POST}`, () => {
    beforeAll(async ()=>{
      app.setParameters(`${url}/remove_from_bin`, false)
    })

    it(`Should return a 201 if folder was removed from bin`, async () => {
      const response = await app.postObject({
        foldersId: [folderId],
      })
      expect(response.status).toBe(201)
    });

    it(`Should return a 400 if neither foldersId nor filesId were send`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });
  })


  describe(`{${url}/delete, POST}`, () => {
    beforeAll(async ()=>{
      app.setParameters(`${url}/delete`, false)
      if(folderId){
        const existingFileBin = await app.getPrisma().folderBin.findFirst({
          where:{ folderId }
        })
        if(!existingFileBin){
          await app.getPrisma().folderBin.create({
            data: {
              folderId,
              removeBy: user.sub,
            },
          })
        }
      }
    })
    
    it(`Should return a 201 if folder was deleted successfully`, async () => {
      const response = await app.postObject({
        foldersId: [folderId],
      })
      expect(response.status).toBe(201)
    });

    it(`Should return a 400 if neither foldersId nor filesId were send`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });
  })


  describe(`{${url}/teamsDelete, POST}`, () => {
    beforeAll( () => {
      app.setParameters(`${url}/teamsDelete`, false)
    })

    it(`Should return a 201 if team was deleted successfully`, async () => {
      const response = await app.postObject({ teamId })
      expect(response.status).toBe(201)
    });

    it(`Should return a 404 if team doesn't exist`, async () => {
      const response = await app.postObject({ teamId })
      expect(response.status).toBe(404)
    });

    it(`Should return a 400 if teamId isn't send`, async () => {
      const response = await app.postObject()
      expect(response.status).toBe(400)
    });
  })
  

  afterAll(async () => {
    if(copyId){
      await app.getPrisma().userFolder.deleteMany({
        where: { folderId: copyId }
      })
      await app.getPrisma().folder.delete({
        where: { id: copyId }
      })
    }

    await app.closeApp()
  })
})
