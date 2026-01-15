import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { RegisterFileDto } from './dto/register.file.dto'
import { UpdateFileDto } from './dto/update.file.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'
import { StorageService } from 'src/storage/storage.service'
import { DocumentService } from 'src/storage/document.service'
import { projectService } from '../project.service'
const brotli = require('brotli-wasm')
//const fs = require('fs')

@Injectable()
export class FileService extends projectService{
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly documentService: DocumentService,
  ) {
    super()
  }

  private async validateUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, active: true },
    })

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  private addUserInfo(userDict: any, userAccess: any){
    const temp: any[] = []
    for(const access of userAccess){
      const User = userDict[access.userId]
      const data = {
        ...access,
        User
      }
      temp.push(data)
    }
    return temp
  }

  private async getForefathers(fatherId: string, folderDict: any, forefathersId: string[]) {
    let path: string = ''
    let folderId: any = fatherId
    const setId: Set<string> = new Set(forefathersId)

    while(folderId){
      if(!setId.has(folderId)){
        setId.add(folderId)
      }else{
        return path
      }
      forefathersId.push(folderId)
      const folder = folderDict[folderId]
      if(!folder){
        const data = await this.prisma.folder.findUnique({
          where: {
            id: folderId
          },
          include: {
            File: true,
            leaf: true,
          }
        })
        if(data){
          folderDict[data.id] = data
          folderId = data.folderId
          path += '\\' + data.name
        }else{
          folderId = null
        }
      }else{
        folderId = folder.folderId
        path += '\\' + folder.name
      }
    }
    
    return path
  }

  private async createArchive(file: any, user: any){
    let buffer = null

    if(this.format[file.type] == '.docx'){
      buffer = await this.documentService.newFile(user.email)
    }
    
    //Comprese archive to br format
    const compressedData = await brotli.compress(buffer)

    return compressedData
  }

  async createFile(data: RegisterFileDto, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!data.name) {
        throw new BadRequestException('File name is required')
      }
      
      let { folderId, projectId, name, url, type } = data
      this.validateFileName(name)
      if(!this.format[type]){
        throw new BadRequestException('Invalid type')
      }
      const user = await this.validateUser(userId)
      const fileOwner = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto,
      }

      let path = ''
      const userDict = {} //Key: user id, Value: userInfo
      let rootAccess: any[] = [] //Saves the access of the folder excludin the userId
      const forefathersId: string[] = []
      if(folderId){
        const userFoldersData = await this.prisma.userFolder.findMany({
          where: {
            userId,
          },
          include: {
            Folder: {
              include:{
                File: true,
                leaf: true,
                UserFolder: {
                  where: {
                    userId: {
                      not: userId,
                    },
                  },
                },
              },
            },
          },
        })
        
        //Key: folder id, Value: folder data
        const folderDict = userFoldersData.reduce((acc, userfolder) => {
          const folder = userfolder.Folder
          acc[folder.id] = folder
            return acc
        }, {})

        const root = folderDict[folderId]
        if (!root) {
          throw new NotFoundException(
            `Folder with ID ${folderId} not found`,
          )
        }

        const allPath = await this.getForefathers(folderId, folderDict, forefathersId)
        path = allPath
        
        const rootUserFolder = root.UserFolder
        const usersId: any[] = []
        for(let access of rootUserFolder){
          if(access.accessType == 'owner'){
            access.accessType = 'write'
          }
          rootAccess.push(access)
          usersId.push(access.userId)
        }

        if(usersId.length > 0){
          const guest = await this.prisma.user.findMany({
            where: {id: {in: usersId}, active: true},
            select: {
              id: true,
              ...this.userInfo.select,
            }
          })

          //Add guest info in userDict
          for(const info of guest){
            userDict[info.id] = {
              email: info.email,
              firstName: info.firstName,
              lastName: info.lastName,
              urlPhoto: info.urlPhoto
            }
          }
        }
      }

      const MyUserFile = await this.prisma.userFile.findMany({
        where: {
          userId,
          accessType: 'owner',
        },
      })
      const myFilesId = MyUserFile.map((userFile) => {
        return userFile.fileId
      })
      
      const existingFile = await this.prisma.file.findFirst({
        where: {
          id: { in: myFilesId },
          type,
          name
        },
      })

      const existingFilesCopy = await this.prisma.file.findMany({
        where: {
          id: { in: myFilesId },
          type,
          name: {
            startsWith: `${name} (`,
            endsWith: `)`,
          }
        },
      })

      name = this.changeName(name, existingFile, existingFilesCopy)

      path = path + '\\' + name
      const diference = path.length - this.maxCharacters
      if (diference > 0){
        throw new BadRequestException(
          `Name exceed maximum number of characters by ${diference} characters`
        )
      }

      const created = await this.prisma.file.create({
        data: {
          folderId,
          ownerId: userId,
          modifyBy: userId,
          projectId,
          name,
          url,
          type,
        },
      })

      const owner = await this.prisma.userFile.create({
        data: {
          userId: userId,
          fileId: created.id,
          accessType: 'owner',
        },
      })
      
      const compressedData = await this.createArchive(created, user)
      await this.storageService.postFile(userId, `${created.id}.br`, compressedData)
      const size = await this.storageService.getFileSize(userId, `${created.id}.br`) || 0

      //Create access to the file for the other users.
      const userFileData: any[] = []
      let otherUserFiles: any[] = []
      for(const userFolder of rootAccess){
        userFileData.push({
          userId: userFolder.userId,
          fileId: created.id,
          accessType: userFolder.accessType,
        })
      }
      if(userFileData.length > 0){
        otherUserFiles = await this.prisma.userFile.createManyAndReturn({
          data: userFileData,
        })
      }
      otherUserFiles = this.addUserInfo(userDict, otherUserFiles)

      const file = {
        //ownerId: userId,
        fileOwner,
        fileModifyBy: fileOwner,
        ...created,
        FileBin: null,
        UserFile: otherUserFiles,
        openedAt: owner.openedAt,
        size
      }

      const updatedFathers: any[] = []
      if(forefathersId.length > 0){
        const temp = await this.prisma.folder.updateManyAndReturn({
          where: { id: { in: forefathersId } },
          data: { modifyBy: userId },
        })
        for(const folder of temp){
          updatedFathers.push({
            ...folder,
            folderModifyBy: {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              urlPhoto: user.urlPhoto
            }
          })
        }
      }
      
      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File created successfully',
        file,
        updatedFathers,
      })
      
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error creating file')
    }
  }

  async createFileBin(fileId: string, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!fileId) {
        throw new BadRequestException('File ID is required')
      }

      const user = await this.validateUser(userId)
      const RemoveBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto
      }

      const file = await this.prisma.file.findFirst({
        where: {
          id: fileId,
          FileBin: null,
        },
        include: {
          UserFile: {
            where: {
              userId,
            },
          },
        },
      })
      if(!file){
        throw new NotFoundException(`File with ID ${fileId} not found`)
      }

      if(!file.UserFile.length){
        throw new ForbiddenException(`You don't have permission to remove this file.`)
      }

      const forefathersId: string[] = []
      if(file.folderId){
        const userFoldersData = await this.prisma.userFolder.findMany({
          where: {
            userId,
          },
          include: {
            Folder: {
              include:{
                FolderBin: true,
                File: true,
                leaf: true,
                UserFolder: {
                  where: {
                    userId: {
                      not: userId,
                    },
                  },
                },
              },
            },
          },
        })
        //Key: folder id, Value: folder data
        const folderDict = userFoldersData.reduce((acc, userfolder) => {
          const folder = userfolder.Folder
          acc[folder.id] = folder
            return acc
        }, {})

        await this.getForefathers(file.folderId, folderDict, forefathersId)
      }

      const created = await this.prisma.fileBin.create({
        data: {
          fileId,
          removeBy: userId,
        },
      })
      const fileBin = {
        ...created,
        RemoveBy
      }

      const updatedFathers: any[] = []
      if(forefathersId.length > 0){
        const temp = await this.prisma.folder.updateManyAndReturn({
          where: { id: { in: forefathersId } },
          data: { modifyBy: userId },
        })
        for(const folder of temp){
          updatedFathers.push({
            ...folder,
            folderModifyBy: {
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              urlPhoto: user.urlPhoto
            }
          })
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File moved to bin successfully',
        fileBin,
        updatedFathers
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      throw new InternalServerErrorException('Error creating file bin')
    }
  }

  async getAllFiles() {
    try {
      const files = await this.prisma.file.findMany()
      const encryptedResponse = this.encryptionService.encrypt(files)
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving files')
    }
  }

  async getFileById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('File ID is required')
      }

      const userFile = await this.prisma.userFile.findFirst({
        where: {
          fileId: id,
          accessType: 'owner',
        },
        include: {
          User: this.userInfo,
          File: {
            include: {
              fileModifyBy: this.userInfo,
              UserFile: {
                where: {
                  accessType: {
                    not: 'owner',
                  },
                },
                select: {
                  userId: true,
                  accessType: true,
                  openedAt: true,
                  User: this.userInfo,
                },
              },
              FileBin: {
                include: {
                  RemoveBy: this.userInfo,
                }
              }
            },
            omit: {
              ownerId: true,
            }
          }
        }
      })
      if (!userFile) {
        throw new NotFoundException('File not found')
      }

      const fileOwner = {
        email: userFile.User.email,
        firstName: userFile.User.firstName,
        lastName: userFile.User.lastName,
        urlPhoto: userFile.User.urlPhoto,
      }
      const file = userFile.File
      const size = await this.storageService.getFileSize(
        userFile.userId, 
        `${file.id}.br`
      )
      const data = {
        ownerId: userFile.userId,
        fileOwner,
        ...file,
        size
      }

      const encryptedResponse = this.encryptionService.encrypt(data)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving file')
    }
  }

  private async findFileSize(fileId: string, ownerId: string, sizeDict: any){
    let size = sizeDict[fileId]
    if (!size) {
      const fileSize = await this.storageService.getFileSize(ownerId, `${fileId}.br`)
      sizeDict[fileId] = fileSize
      size = fileSize
    }
    return size
  }

  async getFileOfUser(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const userFilesData = await this.prisma.userFile.findMany({
        where: {
          userId: userId,
        },
        include: {
          File: {
            include: {
              fileModifyBy: this.userInfo,
              FileBin: {
                select: {
                  createdAt: true,
                  RemoveBy: this.userInfo,
                },
              },
              UserFile: {
                select: {
                  userId: true,
                  accessType: true,
                  openedAt: true,
                  User: this.userInfo,
                },
              },
            },
            omit: {
              ownerId: true
            }
          }
        }
      })

      //Get all the files's data of the user bucket
      const filesSize = await this.storageService.listFiles(userId, '')

      //Create a dictionary of the file sizes
      let sizeDict = filesSize.reduce((acc, file) => {
        const fileId = file.name.replace('.br', '')
        acc[fileId] = file.metadata.size
        return acc
      }, {})

      let userFiles: any[] = []
      let sharedFiles: any[] = []
      let totalSize = 0
      for (const userfile of userFilesData) {
        let file = userfile.File

        const collaborator = file.UserFile
        const index = collaborator.findIndex(
          (entry) => entry.accessType === 'owner',
        )
        const owner = file.UserFile.splice(index, 1)[0] //Deletes and save the owner.
        const size = await this.findFileSize(file.id, owner.userId, sizeDict)
        const data = {
          ownerId: owner.userId,
          fileOwner: owner.User,
          ...file,
          openedAt: userfile.openedAt,
          size,
        }

        if (userfile.userId == userId && userfile.accessType == 'owner') {
          userFiles.push(data)
          totalSize += size
        } else if (!file.FileBin) {
          sharedFiles.push(data)
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        userFiles,
        sharedFiles
      })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving files')
    }
  }

  // async downloadFile(id: string) {
  //   try {
  //     if (!id) {
  //       throw new BadRequestException('File ID is required')
  //     }

  //     const file = await this.prisma.file.findUnique({
  //       where: { id },
  //       include: this.fileInfo,
  //     })

  //     if (!file) {
  //       throw new NotFoundException('File not found')
  //     }
      
  //     const data = await this.storageService.download(file.ownerId, `${id}.br`)
  //     const buffer = Buffer.from(await data.arrayBuffer())
  //     const decompressedData = await brotli.decompress(buffer)
  //     const fileName = file.name + this.format[file.type]
  //     //fs.writeFileSync(fileName, decompressedData)

  //     const encryptedResponse = this.encryptionService.encrypt({
  //       message: 'File downloaded successfully',
  //       fileName,
  //     })

  //     return { encryptedResponse }
  //   } catch (error) {
  //     if (error.status === 400) {
  //       throw new BadRequestException(error.message)
  //     }
  //     if (error.status === 404) {
  //       throw new NotFoundException(error.message)
  //     }
  //     throw new InternalServerErrorException('Error downloading the file')
  //   }
  // }

  async updateFile(id: string, modifyBy: string, data: UpdateFileDto) {
    try {
      if (!id) {
        throw new BadRequestException('File ID is required')
      }

      const user = await this.validateUser(modifyBy)
      const fileModifyBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto,
      }

      const existingAccess = await this.prisma.userFile.findFirst({
        where: {
          userId: modifyBy,
          fileId: id,
        },
        include: {
          File: {
            include: {
              UserFile: {
                where: {
                  userId: {
                    not: modifyBy,
                  },
                },
              },
            },
          },
        },
      })
      if (!existingAccess || existingAccess.accessType == 'read') {
        throw new ForbiddenException(
          `You don't count with permission to modify this file`
        )
      }

      const userFoldersData = await this.prisma.userFolder.findMany({
        where: {
          userId: modifyBy,
        },
        include: {
          Folder: {
            include:{
              File: true,
              leaf: true,
              UserFolder: {
                where: {
                  userId: {
                    not: modifyBy,
                  },
                },
              },
            },
          },
        },
      })
      //Key: folder id, Value: folder data
      const folderDict = userFoldersData.reduce((acc, userfolder) => {
        const folder = userfolder.Folder
        acc[folder.id] = {
          ...folder,
          accessType: userfolder.accessType
        }
          return acc
      }, {})

      const file = existingAccess.File

      let { moveToId, name } = data
      if(name === null){
        name = file.name
      }
      if(modifyBy === null){
        name = file.modifyBy
      }

      let path = '\\' + name
      //Get all the forefathers of a folder
      let forefathersId: string[] = []
      if (file.folderId){
        const allPath = await this.getForefathers(file.folderId, folderDict, forefathersId)
        path = allPath + '\\' + name
      }

      const userDict = {} //Key: user id, Value: userInfo
      let rootAccess: any[] = [] //Saves the access of the folder excludin the userId
      if(moveToId && file.folderId != moveToId){
        const allPath = await this.getForefathers(moveToId, folderDict, forefathersId)
        path = allPath + '\\' + name

        const root = folderDict[moveToId]
        if(!root){
          throw new NotFoundException(`Folder with ID ${moveToId} not found`)
        }
        if(root.accessType == 'read'){
          throw new ForbiddenException(`You doesn't count with permisions to edit this folder`)
        }
        
        const usersId: any[] = []
        for(let access of root.UserFolder){
          if(access.accessType == 'owner'){
            access.accessType = 'write'
          }
          rootAccess.push(access)
          usersId.push(access.userId)
        }

        if(usersId.length > 0){
          const guest = await this.prisma.user.findMany({
            where: {id: {in: usersId}, active: true},
            select: {
              id: true,
              ...this.userInfo.select,
            }
          })

          //Add guest info in userDict
          for(const info of guest){
            userDict[info.id] = {
              email: info.email,
              firstName: info.firstName,
              lastName: info.lastName,
              urlPhoto: info.urlPhoto
            }
          }
        }
      }

      const diference = path.length - this.maxCharacters
      if (diference > 0){
        throw new BadRequestException(
          `Name exceed maximum number of characters by ${diference} characters`
        )
      }


      const updatedData = await this.prisma.file.update({
        where: { id },
        data: {
          folderId: moveToId,
          modifyBy,
          name
        },
      })

      const updatedFile = {
        ...updatedData,
        fileModifyBy,
      }

      const updatedFathers: any[] = []
      if(forefathersId.length > 0){
        const temp = await this.prisma.folder.updateManyAndReturn({
          where: { id: { in: forefathersId } },
          data: { modifyBy },
        })
        for(const folder of temp){
          updatedFathers.push({
            ...folder,
            fileModifyBy
          })
        }
      }
      
      let newUserFile: any[] = []
      let deletedUserFile: string[] = []
      if(file.folderId != moveToId){
        let newCollaborators: any[] = []
        const removedUserId: string[] = []
        const newAccessData: any[] = []
        const ignoreId = new Set() //Saves the users Id that have permission in both files
        const fileAccess = file.UserFile
        const actualAccess = new Set(fileAccess.map(userFile => userFile.userId))

        for (const userFolder of rootAccess) {
          //Check that the user doesn't have a userFile.
          if (!actualAccess.has(userFolder.userId)) {
            newAccessData.push({
              userId: userFolder.userId,
              fileId: file.id,
              accessType: userFolder.accessType,
            })
          } else {
            ignoreId.add(userFolder.userId)
          }
        }
        for (const userFile of fileAccess){
          if (
            userFile.accessType != 'owner' &&
            !ignoreId.has(userFile.userId)
          ) {
            removedUserId.push(userFile.userId)
          }
        }

        if(removedUserId.length > 0){
          await this.prisma.userFile.deleteMany({
            where: {
              fileId: file.id,
              userId: { in: removedUserId },
            }
          })
        }
        if(newAccessData.length > 0){
          newCollaborators = await this.prisma.userFile.createManyAndReturn({
            data: newAccessData
          })
        }
        deletedUserFile = removedUserId
        newUserFile = this.addUserInfo(userDict, newCollaborators)
      }
      

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File updated successfully',
        updatedFile,
        updatedFathers,
        newUserFile,
        deletedUserFile,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error updating the file')
    }
  }

  async deleteFile(fileId: string, userId: string) {
    try {
      if (!fileId) {
        throw new BadRequestException('File ID is required')
      }

      const access = await this.prisma.userFile.findFirst({
        where: {
          fileId,
          userId,
          accessType: 'owner'
        },
        include: {
          File: {
            include: {
              FileBin: true,
            },
          },
        },
      })
      
      if (!access) {
        throw new ForbiddenException("You don't count with the permissions to delete this file")
      }

      const file = access.File
      if (!file.FileBin) {
        throw new NotFoundException(`File with ID ${fileId} not found in bin`)
      }


      await this.storageService.removeFile(userId, [`${fileId}.br`])

      await this.prisma.fileBin.delete({
        where: { fileId },
      })

      await this.prisma.userFile.deleteMany({
        where: { fileId },
      })

      await this.prisma.file.delete({
        where: { id: fileId },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File deleted successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error deleting file')
    }
  }

  async deleteFileBin(fileId: string, userId: string) {
    try {
      if (!fileId) {
        throw new BadRequestException('File ID is required')
      }

      const user = await this.validateUser(userId)
      const folderModifyBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto
      }

      const access = await this.prisma.userFile.findFirst({
        where: {
          fileId,
          userId,
          accessType: 'owner'
        },
        include: {
          File: {
            include: {
              FileBin: true,
            },
          },
        },
      })

      if (!access) {
        throw new ForbiddenException("You don't count with the permissions to remove file from bin")
      }
      const file = access.File

      if (!file.FileBin) {
        throw new NotFoundException(`File with ID ${fileId} not found in bin`)
      }

      await this.prisma.fileBin.delete({
        where: { fileId },
      })

      const forefathersId: string[] = []
      if(file.folderId){
        const userFoldersData = await this.prisma.userFolder.findMany({
          where: {
            userId,
          },
          include: {
            Folder: {
              include:{
                FolderBin: true,
                File: true,
                leaf: true,
                UserFolder: {
                  where: {
                    userId: {
                      not: userId,
                    },
                  },
                },
              },
            },
          },
        })
        //Key: folder id, Value: folder data
        const folderDict = userFoldersData.reduce((acc, userfolder) => {
          const folder = userfolder.Folder
          acc[folder.id] = folder
            return acc
        }, {})

        await this.getForefathers(file.folderId, folderDict, forefathersId)
      }

      const updatedFathers: any[] = []
      if(forefathersId.length > 0){
        const temp = await this.prisma.folder.updateManyAndReturn({
          where: { id: { in: forefathersId } },
          data: { modifyBy: userId },
        })
        for(const folder of temp){
          updatedFathers.push({
            ...folder,
            folderModifyBy
          })
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File removed from bin successfully',
        updatedFathers
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Removing file from bin')
    }
  }

  async duplicateFile(userId: string, fileId: string, moveToId?: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!fileId) {
        throw new BadRequestException('File ID is required')
      }

      const existingAccess = await this.prisma.userFile.findFirst({
        where: { 
          fileId,
          userId,
        },
        include: {
          File: {
            omit: {
              ownerId: true
            },
            include: {
              UserFile: {
                where: {
                  accessType: 'owner',
                },
                select: {
                  userId : true,
                },
              },
              FileBin: true
            },
          },
          User: {
            select: {
              active: true,
              email: true,
              firstName: true,
              lastName: true,
              urlPhoto: true,
            },
          },
        }
      })

      if (!existingAccess) {
        throw new ForbiddenException(`You don't count with the permissions to duplicate this file`)
      }
      if(!existingAccess.User.active){
        throw new NotFoundException(`User with ID ${userId} not found`)
      }

      const file = existingAccess.File
      if (file.FileBin) {
        throw new NotFoundException(`File with Id ${fileId} not found`)
      }
      const fileOwner = {
        email: existingAccess.User.email,
        firstName: existingAccess.User.firstName,
        lastName: existingAccess.User.lastName,
        urlPhoto: existingAccess.User.urlPhoto,
      }

      let path = ''
      let forefathersId: string[] = []
      const userDict = {} //Key: user id, Value: userInfo
      let rootAccess: any[] = [] //Saves the access of the folder excludin the userId
      if(moveToId){
        const userFoldersData = await this.prisma.userFolder.findMany({
          where: {
            userId,
          },
          include: {
            Folder: {
              include:{
                File: true,
                leaf: true,
                UserFolder: {
                  where: {
                    userId: {
                      not: userId,
                    },
                  },
                },
              },
            },
          },
        })
        //Key: folder id, Value: folder data
        const folderDict = userFoldersData.reduce((acc, userfolder) => {
          const folder = userfolder.Folder
          acc[folder.id] = {
            ...folder,
            accessType: userfolder.accessType
          }
            return acc
        }, {})

        const root = folderDict[moveToId]
        if(!root){
          throw new NotFoundException(`Folder with ID ${moveToId} not found`)
        }
        if(root.accessType == 'read'){
          throw new ForbiddenException(`You don't count with permissions to modify this folder`)
        }

        const allPath = await this.getForefathers(moveToId, folderDict, forefathersId)
        path = allPath + '\\'
        
        const usersId: any[] = []
        for(let access of root.UserFolder){
          if(access.accessType == 'owner'){
            access.accessType = 'write'
          }
          rootAccess.push(access)
          usersId.push(access.userId)
        }

        if(usersId.length > 0){
          const guest = await this.prisma.user.findMany({
            where: {id: {in: usersId}, active: true},
            select: {
              id: true,
              ...this.userInfo.select,
            }
          })

          //Add guest info in userDict
          for(const info of guest){
            userDict[info.id] = {
              email: info.email,
              firstName: info.firstName,
              lastName: info.lastName,
              urlPhoto: info.urlPhoto
            }
          }
        }
      }

      let name = 'Copy '+ file.name
      const type = file.type

      path = path + '\\' + name
      const diference = path.length - this.maxCharacters
      if (diference > 0){
        throw new BadRequestException(
          `Name exceed maximum number of characters by ${diference} characters`
        )
      }
      
      const MyUserFile = await this.prisma.userFile.findMany({
        where: {
          userId,
          accessType: 'owner',
        },
      })
      const myFilesId = MyUserFile.map((userFile) => {
        return userFile.fileId
      })

      const existingFile = await this.prisma.file.findFirst({
        where: {
          id: { in: myFilesId },
          type,
          name
        },
      })
      const existingFilesCopy = await this.prisma.file.findMany({
        where: {
          id: { in: myFilesId },
          type,
          name: {
            startsWith: `${name} (`,
            endsWith: `)`,
          }
        },
      })

      name = this.changeName(name, existingFile, existingFilesCopy)

      const created = await this.prisma.file.create({
        data: {
          folderId: moveToId,
          ownerId: userId,
          modifyBy: userId,
          projectId: file.projectId,
          name,
          url: file.url,
          type: file.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      const ownerFile = await this.prisma.userFile.create({
        data: {
          userId: userId,
          fileId: created.id,
          accessType: 'owner',
        },
      })

      let size = 0
      if (existingAccess.accessType == 'owner'){
        await this.storageService.copyFile(userId, `${file.id}.br`, `${created.id}.br`)
        size = await this.storageService.getFileSize(userId, `${created.id}.br`) || 0
      } else {
        const ownerId = file['UserFile'][0]['userId']
        const download = await this.storageService.download(ownerId, `${file.id}.br`)
        size = download.size
        await this.storageService.postFile(userId, `${created.id}.br`, download)
      }

      //Create access to the file for the other users.
      const userFileData: any[] = []
      let otherUserFiles: any[] = []
      for(const userFolder of rootAccess){
        userFileData.push({
          userId: userFolder.userId,
          fileId: created.id,
          accessType: userFolder.accessType,
        })
      }
      if(userFileData.length > 0){
        otherUserFiles = await this.prisma.userFile.createManyAndReturn({
          data: userFileData,
        })
      }
      otherUserFiles = this.addUserInfo(userDict, otherUserFiles)

      const copyFile = {
        //ownerId: userId,
        fileOwner,
        fileModifyBy: fileOwner,
        ...created,
        FileBin: null,
        UserFile: otherUserFiles,
        openedAt: ownerFile.openedAt,
        size
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'File duplicated successfully',
        copyFile,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error duplicating the file')
    }
  }
}
