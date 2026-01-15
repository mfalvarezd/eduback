import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common'
import { RegisterFolderDto } from './dto/register.folder.dto'
import { UpdateFolderDto } from './dto/update.folder.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'
import { StorageService } from 'src/storage/storage.service'
import { projectService } from '../project.service'

@Injectable()
export class FolderService extends projectService {
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
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

  private async createElement(
    data: RegisterFolderDto,
    user: any,
    isTeam: boolean,
    myFoldersId: string[]
  ) {
    let { folderId, name } = data
    const folderOwner = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      urlPhoto: user.urlPhoto,
    }

    const existingElement = await this.prisma.folder.findFirst({
      where: {
        id: { in: myFoldersId },
        isTeam,
        FolderBin: null,
        name
      },
    })

    const existingElementsCopy = await this.prisma.folder.findMany({
      where: {
        id: { in: myFoldersId },
        isTeam,
        FolderBin: null,
        name: {
          startsWith: `${name} (`,
          endsWith: `)`,
        },
      },
    })

    name = this.changeName(name, existingElement, existingElementsCopy)

    const created = await this.prisma.folder.create({
      data: {
        folderId,
        name,
        ownerId: user.id,
        modifyBy: user.id,
        isTeam,
      },
    })

    const userFolder = await this.prisma.userFolder.create({
      data: {
        userId: user.id,
        folderId: created.id,
        accessType: 'owner',
      },
    })

    const folderData = {
      //ownerId: userId,
      folderOwner,
      folderModifyBy: folderOwner,
      ...created,
      FolderBin: null,
      leaf: [],
      File: [],
      openedAt: userFolder.openedAt,
      size: 0
    }

    return { folderData, userFolder }
  }

  async createFolder(data: RegisterFolderDto, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      
      const{folderId, name} = data
      
      this.validateName(name)
      const user = await this.validateUser(userId)
      
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
      
      let myFoldersId: string[] = []
      //Key: folder id, Value: folder data
      const folderDict = userFoldersData.reduce((acc, userfolder) => {
        const folder = userfolder.Folder
        if(userfolder.accessType == 'owner'){
          myFoldersId.push(userfolder.folderId)
        }
        acc[folder.id] = folder
          return acc
      }, {})

      let path = '\\' + name
      const userDict = {} //Key: user id, Value: userInfo
      let rootAccess: any[] = [] //Saves the access of the folder excludin the userId
      const forefathersId: string[] = []
      if (folderId) {
        const root = folderDict[folderId]
        if (!root) {
          throw new NotFoundException(
            `Folder with ID ${folderId} not found`,
          )
        }
        const allPath = await this.getForefathersId(folderId, folderDict, forefathersId)
        path = allPath + name
        
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

      const diference = path.length - this.maxCharacters
      if (diference > 0){
        throw new BadRequestException(
          `Name exceed maximum number of characters by ${diference} characters`
        )
      }

      const { folderData, userFolder } = await this.createElement(
        data,
        user,
        false,
        myFoldersId
      )

      const userFolderData: any[] = []
      for(const userFolder of rootAccess){
        userFolderData.push({
          userId: userFolder.userId,
          folderId: folderData.id,
          accessType: userFolder.accessType,
        })
      }

      let otherUserFolders: any[] = []
      if(userFolderData.length > 0){
        otherUserFolders = await this.prisma.userFolder.createManyAndReturn({
          data: userFolderData,
        })
      }
      otherUserFolders = this.addUserInfo(userDict, otherUserFolders)

      const folder = {
        ...folderData,
        UserFolder: otherUserFolders
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
        message: 'Folder created successfully',
        folder,
        userFolder,
        updatedFathers,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error creating folder')
    }
  }

  async createTeam(name: string, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!name) {
        throw new BadRequestException('Team name is required')
      }

      const user = await this.validateUser(userId)
      if (user.role != 'Administrador') {
        throw new ForbiddenException(
          `You don't have permission to create a team`,
        )
      }

      const myFolders = await this.prisma.userFolder.findMany({
        where: {
          userId: user.id,
          accessType: 'owner',
        },
      })
      const myFoldersId = myFolders.map(userFolder => userFolder.folderId)

      const { folderData, userFolder } = await this.createElement(
        { name },
        user,
        true,
        myFoldersId
      )

      const folder = {
        ...folderData,
        UserFolder: [],
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Team created successfully',
        folder,
        userFolder,
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
      throw new InternalServerErrorException('Error creating team')
    }
  }

  async createFolderBin(
    userId: string,
    foldersId?: Array<string>,
    filesId?: Array<string>,
  ) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }

      const user = await this.validateUser(userId)
      const RemoveBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto
      }

      let allFoldersId = new Set(foldersId)
      const fathersId: Set<string> = new Set()
      const filesBinData: any[] = []
      const foldersBinData: any[] = []

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
      const folderDict = {} //Key: folder id, Value: folder data
      for (const userfolder of userFoldersData) {
        const folder = userfolder.Folder
        folderDict[folder.id] = folder
        if (
          !folder.isTeam &&
          !folder.FolderBin &&
          allFoldersId.has(folder.id) &&
          userfolder.accessType != 'read'
        ) {
          foldersBinData.push({
            folderId: folder.id,
            removeBy: userId,
          })
          if(folder.folderId && !allFoldersId.has(folder.folderId)){
            fathersId.add(folder.folderId)
          }
        }
      }
      if (filesId) {
        const existingFiles = await this.prisma.file.findMany({
          where: {
            id: { in: filesId },
            FileBin: null,
          },
          include: {
            UserFile: {
              where: {
                userId,
              },
              select: {
                userId: true,
                accessType: true,
              },
            },
          },
        })
        for (const file of existingFiles) {
          if (
            file.UserFile[0] &&
            file.UserFile[0].accessType != 'read'
          ) {
            filesBinData.push({
              fileId: file.id,
              removeBy: userId,
            })
            if(file.folderId && !allFoldersId.has(file.folderId)){
              fathersId.add(file.folderId)
            }
          }
        }
      }

      const filesBin: any[] = []
      const foldersBin: any[] = []
      if (filesBinData.length > 0) {
        const binCreated = await this.prisma.fileBin.createManyAndReturn({
          data: filesBinData,
        })
        for(const bin of binCreated){
          filesBin.push({
            ...bin,
            RemoveBy
          })
        }
      }
      if (foldersBinData.length > 0) {
        const binCreated = await this.prisma.folderBin.createManyAndReturn({
          data: foldersBinData,
        })
        for(const bin of binCreated){
          foldersBin.push({
            ...bin,
            RemoveBy
          })
        }
      }

      let forefathersId: string[] = []
      for(const id of fathersId){
        await this.getForefathersId(id, folderDict, forefathersId)
      }
      const uniqueForefathers = new Set(forefathersId)
      forefathersId = [...uniqueForefathers]

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
              ...RemoveBy
            }
          })
        }
      }

      const numFiles = filesBin.length
      const numFolders = foldersBin.length

      let message =
        'The folders and files which you have access are already in bin'
      if (numFiles * numFolders) {
        message =
          'The folders and files which you have access were moved successfully to the bin'
      } else {
        if (numFiles) {
          message =
            'The files which you have access were moved successfully to the bin'
        } else if (numFolders) {
          message =
            'The folders which you have access were moved successfully to the bin'
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message,
        filesBin,
        foldersBin,
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
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating folder bin')
    }
  }

  async getAllFolders() {
    try {
      const folders = await this.prisma.folder.findMany()
      const encryptedResponse = this.encryptionService.encrypt(folders)
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving folders')
    }
  }

  async getFolderById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Folder ID is required')
      }

      const folder = await this.prisma.folder.findUnique({
        where: { id },
      })

      if (!folder) {
        throw new NotFoundException('Folder not found')
      }

      const encryptedResponse = this.encryptionService.encrypt(folder)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving folder')
    }
  }

  async getFolderOfUser(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const userFoldersData = await this.prisma.userFolder.findMany({
        where: {
          userId: userId,
        },
        include: {
          Folder: {
            include: {
              folderModifyBy: this.userInfo,
              FolderBin: {
                select: {
                  createdAt: true,
                  RemoveBy: this.userInfo,
                },
              },
              leaf: {
                select: {
                  id: true,
                },
              },
              File: {
                where: {
                  FileBin: null,
                },
                include: {
                  UserFile: {
                    where: {
                      accessType: 'owner',
                    },
                    select: {
                      userId: true,
                    },
                  },
                },
                omit: {
                  ownerId: true,
                },
              },
              UserFolder: {
                select: {
                  userId: true,
                  accessType: true,
                  openedAt: true,
                  User: this.userInfo,
                },
              },
            },
            omit: {
              ownerId: true,
            },
          },
        },
      })

      const filesSize = await this.storageService.listFiles(userId, '')

      let sizeDict = filesSize.reduce((acc, file) => {
        const fileId = file.name.replace('.br', '')
        acc[fileId] = file.metadata.size
        return acc
      }, {})

      let mainFoldersId: any[] = [] //Saves the folder's id that aren't inside of a folder
      //Creates a dictionary with the key as the id of a folder and the value as the folder information
      const folderDict = userFoldersData.reduce((acc, userfolder) => {
        const folder = userfolder.Folder
        acc[folder.id] = folder
        if (!folder.folderId) {
          mainFoldersId.push(folder.id)
        }
        return acc
      }, {})

      let folderSize = {}
      const folderTree = {}
      const folderTreeKey: any[] = []
      const pathStack: any[] = mainFoldersId.slice() //Duplicates the array the array of mainFoldersId and saves the path in pathStack

      while (pathStack.length > 0) {
        const currentPath = pathStack.pop()
        const subFolderStack: any[] = []
        folderSize[currentPath] = 0

        const folder = folderDict[currentPath]

        for (const file of folder.File) {
          const ownerId = file['UserFile'][0]['userId']
          const file_size = await this.findFileSize(file.id, ownerId, sizeDict)
          folderSize[currentPath] = folderSize[currentPath] + file_size
        }
        for (const leaf of folder.leaf) {
          const path = folderDict[leaf.id]
          pathStack.push(path.id)
          subFolderStack.push(path.id)
        }

        //If the current path has folders inside it saves them with the key as the current path
        if (subFolderStack.length > 0) {
          folderTree[currentPath] = subFolderStack
          folderTreeKey.push(currentPath)
        }
      }

      //Add the size of the folders inside a folder
      while (folderTreeKey.length > 0) {
        const currentPath = folderTreeKey.pop()
        const subFolders = folderTree[currentPath] //Get the folders of a folder
        for (const folder of subFolders) {
          folderSize[currentPath] = folderSize[currentPath] + folderSize[folder]
        }
      }

      let userFolders: any[] = []
      let sharedFolders: any[] = []
      for (const userfolder of userFoldersData) {
        let folder = userfolder.Folder

        const collaborator = folder.UserFolder
        const index = collaborator.findIndex(
          (entry) => entry.accessType === 'owner',
        )
        const owner = folder.UserFolder.splice(index, 1)[0]
        let size = 0
        if (folderSize[folder.id]) {
          size = folderSize[folder.id]
        }

        const data = {
          ownerId: owner.userId,
          folderOwner: owner.User,
          ...folder,
          openedAt: userfolder.openedAt,
          size,
        }

        if (userfolder.userId == userId && userfolder.accessType == 'owner') {
          userFolders.push(data)
        } else if (!folder.FolderBin) {
          sharedFolders.push(data)
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        userFolders,
        sharedFolders,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving files')
    }
  }

  async getFolderInBin(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const userFolderData = await this.prisma.folder.findMany({
        where: {
          ownerId: userId,
          NOT: {
            FolderBin: null,
          },
        },
        include: {
          folderOwner: this.userInfo,
          folderModifyBy: this.userInfo,
          FolderBin: {
            select: {
              createdAt: true,
              RemoveBy: this.userInfo,
            },
          },
          UserFolder: {
            select: {
              userId: true,
              accessType: true,
              openedAt: true,
              User: this.userInfo,
            },
          },
        },
      })

      let trashFiles: any[] = []
      for (const file of userFolderData) {
        const size = 0
        const user = file.UserFolder.find(
          (entry) => entry.accessType === 'owner',
        )
        const index = file.UserFolder.findIndex(
          (entry) => entry.accessType === 'owner',
        )
        file.UserFolder.splice(index, 1)
        trashFiles.push({
          ...file,
          openedAt: user?.openedAt,
          size,
        })
      }

      const encryptedResponse = this.encryptionService.encrypt({ trashFiles })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving files in bin')
    }
  }

  private async findFileSize(fileId: string, ownerId: string, sizeDict: any) {
    let size = sizeDict[fileId]
    if (!size) {
      const fileSize = await this.storageService.getFileSize(
        ownerId,
        `${fileId}.br`,
      )
      sizeDict[fileId] = fileSize
      size = fileSize
    }
    return size
  }

  async getDirectory(userId: string) {
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
              ownerId: true,
            },
          },
        },
      })

      const userFoldersData = await this.prisma.userFolder.findMany({
        where: {
          userId: userId,
        },
        include: {
          Folder: {
            include: {
              folderModifyBy: this.userInfo,
              FolderBin: {
                select: {
                  createdAt: true,
                  RemoveBy: this.userInfo,
                },
              },
              leaf: {
                select: {
                  id: true,
                },
              },
              File: {
                where: {
                  FileBin: null,
                },
                include: {
                  UserFile: {
                    where: {
                      accessType: 'owner',
                    },
                    select: {
                      userId: true,
                    },
                  },
                },
                omit: {
                  ownerId: true,
                },
              },
              UserFolder: {
                select: {
                  userId: true,
                  accessType: true,
                  openedAt: true,
                  User: this.userInfo,
                },
              },
            },
            omit: {
              ownerId: true,
            },
          },
        },
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

      let mainFoldersId: any[] = [] //Saves the folder's id that aren't inside of a folder
      //Creates a dictionary with the key as the id of a folder and the value as the folder information
      const folderDict = userFoldersData.reduce((acc, userfolder) => {
        const folder = userfolder.Folder
        acc[folder.id] = folder
        if (!folder.folderId) {
          mainFoldersId.push(folder.id)
        }
        return acc
      }, {})

      let folderSize = {}
      const folderTree = {}
      const folderTreeKey: any[] = []
      const pathStack: any[] = mainFoldersId.slice() //Duplicates the array the array of mainFoldersId and saves the path in pathStack

      while (pathStack.length > 0) {
        const currentPath = pathStack.pop()
        const subFolderStack: any[] = []
        folderSize[currentPath] = 0

        const folder = folderDict[currentPath]

        for (const file of folder.File) {
          const ownerId = file['UserFile'][0]['userId']
          const file_size = await this.findFileSize(file.id, ownerId, sizeDict)
          folderSize[currentPath] = folderSize[currentPath] + file_size
        }
        for (const leaf of folder.leaf) {
          if (!leaf || !leaf.id) {
            continue
          }
          const path = folderDict[leaf.id]

          if (!path) {
            continue
          }
          pathStack.push(path.id)
          subFolderStack.push(path.id)
        }

        //If the current path has folders inside it saves them with the key as the current path
        if (subFolderStack.length > 0) {
          folderTree[currentPath] = subFolderStack
          folderTreeKey.push(currentPath)
        }
      }

      //Add the size of the folders inside a folder
      while (folderTreeKey.length > 0) {
        const currentPath = folderTreeKey.pop()
        const subFolders = folderTree[currentPath] //Get the folders of a folder
        for (const folder of subFolders) {
          folderSize[currentPath] = folderSize[currentPath] + folderSize[folder]
        }
      }

      let userFolders: any[] = []
      let sharedFolders: any[] = []
      for (const userfolder of userFoldersData) {
        let folder = userfolder.Folder

        const collaborator = folder.UserFolder
        const index = collaborator.findIndex(
          (entry) => entry.accessType === 'owner',
        )
        const owner = folder.UserFolder.splice(index, 1)[0]
        let size = 0
        if (folderSize[folder.id]) {
          size = folderSize[folder.id]
        }

        const data = {
          ownerId: owner.userId,
          folderOwner: owner.User,
          ...folder,
          openedAt: userfolder.openedAt,
          size,
        }

        if (userfolder.userId == userId && userfolder.accessType == 'owner') {
          userFolders.push(data)
        } else if (!folder.FolderBin) {
          sharedFolders.push(data)
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        userFiles,
        sharedFiles,
        userFolders,
        sharedFolders,
        totalSize,
      })

      return { encryptedResponse }
    } catch (error) {
      console.log(error)
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving files')
    }
  }

  //Add the userInfo to the new UserFolders/UserFiles
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

  async updateFolder(id: string, modifyBy: string, data: UpdateFolderDto) {
    try {
      if (!id) {
        throw new BadRequestException('Folder ID is required')
      }

      const user = await this.validateUser(modifyBy)
      const folderModifyBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto,
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
      const userFilesData = await this.prisma.userFile.findMany({
        where: {
          userId: modifyBy,
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

      //Key: folder id, Value: folder data
      const folderDict = userFoldersData.reduce((acc, userfolder) => {
        const folder = userfolder.Folder
        acc[folder.id] = folder
          return acc
      }, {})
      //Key: file id, Value: file data
      const fileDict = userFilesData.reduce((acc, userFile) => {
        const file = userFile.File
        acc[file.id] = file
          return acc
      }, {})

      const existingFolder = folderDict[id]
      if (!existingFolder) {
        throw new NotFoundException(`Folder with ID ${id} not found`)
      }

      let { moveToId, name, openedAt } = data
      if (moveToId == id) {
        throw new BadRequestException("Folder can't be storage in itself")
      } else if (!moveToId && moveToId !== null){
        moveToId = existingFolder.folderId
      }
      if (name === null) {
        name = existingFolder.name
      }
      if (name) {
        this.validateName(name)
      }
      
      //actualizar el campo openedAt en UserFolder(solo se actualiza al abrir una carpeta)
      if (openedAt) {
        await this.prisma.userFolder.updateMany({
          where: {
            folderId: id,
            userId: modifyBy,
          },
          data: {
            openedAt,
          },
        })
      }

      let path = '\\' + name
      //Get all the forefathers of a folder
      let forefathersId: string[] = []
      if (existingFolder.folderId){
        const allPath = await this.getForefathersId(existingFolder.folderId, folderDict, forefathersId)
        path = allPath + '\\' + name
      }
      
      const userDict = {} //Key: user id, Value: userInfo
      const rootAccess: any[] = [] //Saves the access of the folder excludin the userId
      if (moveToId && existingFolder.folderId != moveToId) {
        const allPath = await this.getForefathersId(moveToId, folderDict, forefathersId)
        path = allPath + '\\' + name

        const root = folderDict[moveToId]
        if (!root) {
          throw new NotFoundException(`Folder with ID ${moveToId} not found`)
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

      const updatedData = await this.prisma.folder.update({
        where: { id },
        data: {
          folderId: moveToId,
          modifyBy,
          name,
        },
      })

      const updatedFolder = {
        ...updatedData,
        folderModifyBy,
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
            folderModifyBy
          })
        }
      }

      let newUserFolder = {} //Key: folder id, Value: usersFolder
      let newUserFile = {} //Key: file id, Value: usersFolder
      let deletedUserFolder = {} //Key: folder id, Value: array of users Id
      let deledtedUserFile = {} //Key: file id, Value: array of users Id

      const folderStack: any[] = []
      if (existingFolder.folderId != moveToId) {
        let newCollaborators: any[] = []
        const {newAccessData, removedUserId} = this.editFolderAccess(existingFolder, rootAccess)

        if (removedUserId.length > 0) {
          await this.prisma.userFolder.deleteMany({
            where: {
              folderId: id,
              userId: { in: removedUserId },
            },
          })
        }
        if (newAccessData.length > 0) {
          newCollaborators = await this.prisma.userFolder.createManyAndReturn({
            data: newAccessData,
          })
        }
        //Add the userInfo to the new UserFolders
        newUserFolder[id] = this.addUserInfo(userDict, newCollaborators)
        deletedUserFolder[id] = removedUserId
        folderStack.push(existingFolder)
      }
      

      while(folderStack.length > 0){
        const currentFolder = folderStack.pop()
        //Updates the permisions of the file
        for(const file of currentFolder.File){
          let fileData = fileDict[file.id]
          if(fileData){
            let newCollaborators: any[] = []
            const {newAccessData, removedUserId} = this.editFileAccess(fileData, rootAccess)
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
            deledtedUserFile[file.id] = removedUserId
            newUserFile[file.id] = this.addUserInfo(userDict, newCollaborators)
          }
        }
  
        for(const leaf of currentFolder.leaf){
          const folderData = folderDict[leaf.id]
          if(folderData){
            folderStack.push(folderData)
            let newCollaborators: any[] = []
            const {newAccessData, removedUserId} = this.editFolderAccess(folderData, rootAccess)
            if(removedUserId.length > 0){
              await this.prisma.userFolder.deleteMany({
                where: {
                  folderId: leaf.id,
                  userId: { in: removedUserId }
                }
              })
            }
            if(newAccessData.length > 0){
              newCollaborators = await this.prisma.userFolder.createManyAndReturn({
                data: newAccessData
              })
            }
            deletedUserFolder[leaf.id] = removedUserId
            newUserFolder[leaf.id] = this.addUserInfo(userDict, newCollaborators)
          }
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Folder updated successfully',
        updatedFathers,
        updatedFolder,
        newUserFolder,
        newUserFile,
        deletedUserFolder,
        deledtedUserFile,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error updating the folder')
    }
  }

  private editFolderAccess(folder: any, rootAccess:any){
    const removedUserId: string[] = []
    const newAccessData: any[] = []
    const ignoreId = new Set() //Saves the users Id that have permission in both folders
    const folderAccess = folder.UserFolder
    const actualAccess = new Set(folderAccess.map(userFolder => userFolder.userId))
    
    for (const userFolder of rootAccess) {
      //Check that the user doesn't have a userFolder
      if (!actualAccess.has(userFolder.userId)) {
        newAccessData.push({
          userId: userFolder.userId,
          folderId: folder.id,
          accessType: userFolder.accessType,
        })
      } else {
        ignoreId.add(userFolder.userId)
      }
    }
    //Delete the oldFolder access if it exist
    for(const userFolder of folderAccess){
      if (
        userFolder.accessType != 'owner' &&
        !ignoreId.has(userFolder.userId)
      ) {
        removedUserId.push(userFolder.userId)
      }
    }

    return {newAccessData, removedUserId}
  }

  private editFileAccess(file: any, rootAccess:any){
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

    return {newAccessData, removedUserId}
  }

  async updateTeam(id: string, modifyBy: string, name: string) {
    try {
      if (!id) {
        throw new BadRequestException('Team ID is required')
      }
      const user = await this.validateUser(modifyBy)
      const folderModifyBy = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto
      }

      const myUserFolder = await this.prisma.userFolder.findFirst({
        where: {
          userId: modifyBy,
          folderId: id,
        },
        include: {
          Folder: true,
        }
      })

      if (!myUserFolder || myUserFolder.accessType == 'read') {
        throw new ForbiddenException(
          `You don't count with permission to modify this team`,
        )
      }

      const myTeam = myUserFolder.Folder

      if (!myTeam.isTeam) {
        throw new NotFoundException(`Team with ID ${id} not found`)
      }

      if (name === null) {
        name = myTeam.name
      }

      const updatedData = await this.prisma.folder.update({
        where: { id },
        data: {
          name,
          modifyBy,
        },
      })

      const updatedTeam = {
        ...updatedData,
        folderModifyBy
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Team updated successfully',
        updatedTeam,
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
      throw new InternalServerErrorException('Error updating the team')
    }
  }

  private async getForefathersId(fatherId: string, folderDict: any, forefathersId: string[]) {
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

  async deleteFolder(foldersId?: Array<string>, filesId?: Array<string>) {
    try {
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }

      let numFiles = 0
      if (filesId) {
        const existingFiles = await this.prisma.file.findMany({
          where: {
            id: { in: filesId },
            NOT: { FileBin: null },
          },
        })
        const removeId: any[] = []
        const fileStorage: any[] = []
        for (const index in existingFiles) {
          const file = existingFiles[index]
          removeId.push(file.id)
          fileStorage.push(`${file.id}.br`)
        }

        if (removeId.length > 0) {
          const ownerId = existingFiles[0].ownerId
          numFiles = removeId.length
          await this.storageService.removeFile(ownerId, fileStorage)
          await this.prisma.fileBin.deleteMany({
            where: { fileId: { in: removeId } },
          })
          await this.prisma.userFile.deleteMany({
            where: { fileId: { in: removeId } },
          })
          await this.prisma.file.deleteMany({
            where: { id: { in: removeId } },
          })
        }
      }

      let numFolders = 0
      if (foldersId) {
        const existingFolders = await this.prisma.folder.findMany({
          where: {
            id: { in: foldersId },
            NOT: { FolderBin: null },
            isTeam: false,
          },
        })
        const removeId: any[] = []
        for (const index in existingFolders) {
          const folder = existingFolders[index]
          removeId.push(folder.id)
        }

        if (removeId.length > 0) {
          numFolders = removeId.length
          await this.prisma.folder.updateMany({
            where: { id: { in: removeId } },
            data: { folderId: null },
          })

          await this.prisma.folderBin.deleteMany({
            where: { folderId: { in: removeId } },
          })
          await this.prisma.userFolder.deleteMany({
            where: { folderId: { in: removeId } },
          })
          await this.prisma.folder.deleteMany({
            where: { id: { in: removeId } },
          })
        }
      }

      let message = "The folders and files weren't in bin"
      if (numFiles * numFolders) {
        message = 'The folders and files were deleted successfully'
      } else {
        if (numFiles) {
          message = 'The files were deleted successfully'
        } else if (numFolders) {
          message = 'The folders were deleted successfully'
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error deleting folder')
    }
  }

  async deleteTeam(
    teamId: string,
    foldersId?: Array<string>,
    filesId?: Array<string>,
  ) {
    try {
      if (!teamId) {
        throw new BadRequestException('Team Id is required')
      }

      const existingTeam = await this.prisma.folder.findUnique({
        where: { id: teamId, isTeam: true },
      })
      if (!existingTeam) {
        throw new NotFoundException(`Team with ID ${teamId} not found`)
      }

      if (filesId) {
        const existingFiles = await this.prisma.file.findMany({
          where: {
            id: { in: filesId },
          },
          include: {
            FileBin: true,
          },
        })

        const removeId: any[] = []
        const fileStorage: any[] = []
        const removeBin: any[] = []
        for (const index in existingFiles) {
          const file = existingFiles[index]
          removeId.push(file.id)
          fileStorage.push(`${file.id}.br`)
          if (file.FileBin) {
            removeBin.push(file.id)
          }
        }

        if (removeId.length > 0) {
          const ownerId = existingFiles[0].ownerId
          await this.storageService.removeFile(ownerId, fileStorage)
          await this.prisma.fileBin.deleteMany({
            where: { fileId: { in: removeBin } },
          })
          await this.prisma.userFile.deleteMany({
            where: { fileId: { in: removeId } },
          })
          await this.prisma.file.deleteMany({
            where: { id: { in: removeId } },
          })
        }
      }

      if (foldersId) {
        const existingFolders = await this.prisma.folder.findMany({
          where: {
            id: { in: foldersId },
            isTeam: false,
          },
          include: {
            FolderBin: true,
          },
        })
        const removeId: any[] = []
        const removeBin: any[] = []
        for (const index in existingFolders) {
          const folder = existingFolders[index]
          removeId.push(folder.id)
          if (folder.FolderBin) {
            removeBin.push(folder.id)
          }
        }

        if (removeId.length > 0) {
          await this.prisma.folder.updateMany({
            where: { id: { in: removeId } },
            data: { folderId: null },
          })

          await this.prisma.folderBin.deleteMany({
            where: { folderId: { in: removeBin } },
          })
          await this.prisma.userFolder.deleteMany({
            where: { folderId: { in: removeId } },
          })
          await this.prisma.folder.deleteMany({
            where: { id: { in: removeId } },
          })
        }
      }

      await this.prisma.userFolder.deleteMany({
        where: { folderId: teamId },
      })
      await this.prisma.folder.delete({
        where: { id: teamId },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Team deleted successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message)
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error deleting team')
    }
  }

  async deleteFolderBin(foldersId?: Array<string>, filesId?: Array<string>) {
    try {
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }

      let numFiles = 0
      if (filesId) {
        const filesBin = await this.prisma.fileBin.deleteMany({
          where: {
            fileId: { in: filesId },
          },
        })
        numFiles = filesBin.count || 0
      }

      let numFolders = 0
      if (foldersId) {
        const foldersBin = await this.prisma.folderBin.deleteMany({
          where: {
            folderId: { in: foldersId },
          },
        })
        numFolders = foldersBin.count || 0
      }

      let message = 'The folders and files were moved already from bin'
      if (numFiles * numFolders) {
        message = 'The folders and files were moved successfully from the bin'
      } else {
        if (numFiles) {
          message = 'The files were moved successfully from the bin'
        } else if (numFolders) {
          message = 'The folders were moved successfully from the bin'
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message)
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error deleting FolderBin')
    }
  }

  //Arreglar que se actualice las carpetas padre
  async duplicateFolder(userId: string, moveToId?: string, foldersId?: Array<string>, filesId?: Array<string>) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }

      const user = await this.validateUser(userId)
      const folderOwner = {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        urlPhoto: user.urlPhoto,
      }

      const accessArray: any[] = [] //Saves the access of all the users
      const userDict = {} //Key: user id, Value: userInfo
      
      if (moveToId) {
        const existingAccess = await this.prisma.userFolder.findFirst({
          where: {
            folderId: moveToId,
            userId
          },
          include: {
            Folder: {
              include: {
                FolderBin: true,
                UserFolder: {
                  where: {
                    userId: {
                      not: userId
                    },
                  },
                },
              },
            },
          },
        })

        if(!existingAccess || existingAccess.accessType == 'read'){
          throw new ForbiddenException(`You don't count with permissions to modify this folder`)
        }
        const rootUserFolder = existingAccess.Folder.UserFolder

        const usersId: any[] = []
        for (const access of rootUserFolder){
          const data = {
            userId: access.userId,
            accessType: access.accessType
          }
          if ( data.accessType == 'owner') {
            data.accessType = 'write'
          }
          accessArray.push(data)
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
      
      let allFileAccess: any[] = []
      let allFolderAccess: any[] = []
      if (filesId) {
        allFileAccess = await this.prisma.userFile.findMany({
          where: { 
            fileId: { in: filesId },
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
              },
            },
          }
        })
      }
      if (foldersId){
        allFolderAccess = await this.prisma.userFolder.findMany({
          where: {
            userId,
          },
          include: {
            Folder: {
              omit: {
                ownerId: true
              },
              include: {
                leaf: {
                  select: {
                    id: true
                  }
                },
                File: {
                  select: {
                    id: true
                  }
                },
                FolderBin: true
              },
            },
            User: {
              select: {
                active: true,
              },
            },
          }
        })
      }

      let totalSize = 0
      const foldersSet = new Set(foldersId)
      const folderDict = {}
      let mainFolderId: any[] = []
      const folderTree = {} //Key: id of a folder, value: array of folders id
      let index = 0
      const idToIndex = {} //Key: id of a folder, value: index in array
      const userFolders: any[] = []
      const folderNewToOld = {} //Key: copy folder Id, value: original folder Id
      const folderOldToNew = {} //Key: original folder Id, value: copy folder Id
      //Creates the copy of the folers and their userFolder
      for (const userFolder of allFolderAccess) {
        const folder = userFolder.Folder
        folderDict[folder.id] = folder
        if (
          !folder.FolderBin &&
          foldersSet.has(folder.id) &&
          !folder.isTeam
        ) {
          //Creates a copy of the folder in the database
          const name = "copy " + folder.name
          const created = await this.prisma.folder.create({
            data:{
              name,
              ownerId: userId,
              modifyBy: userId,
              isTeam: false
            }
          })

          //Creates the userFolder
          const tempUserFolder: any[] = []
          for ( const data of accessArray ){
            tempUserFolder.push({
              ...data,
              folderId: created.id
            })
          }
          const owner = await this.prisma.userFolder.create({
            data: {
              userId,
              folderId: created.id,
              accessType: 'owner',
            },
          })
          let otherUserFolders = await this.prisma.userFolder.createManyAndReturn({
            data: tempUserFolder
          })

          otherUserFolders = this.addUserInfo(userDict, otherUserFolders)

          folderTree[folder.id] = folder.leaf

          userFolders.push({
            //ownerId: userId,
            folderOwner,
            folderModifyBy: folderOwner,
            ...created,
            FolderBin: null,
            leaf: [],
            File: [],
            openedAt: owner.openedAt,
            UserFolder: otherUserFolders,
            size: 0
          })
          idToIndex[created.id] = index
          ++index

          folderNewToOld[created.id] = folder.id
          folderOldToNew[folder.id] = created.id

          if ( !foldersSet.has(folder.folderId) ) {
            mainFolderId.push(created.id)
          }
        }
      }
      
      const forefathersId: string[] = []
      if (moveToId) {
        await this.getForefathersId(moveToId, folderDict, forefathersId)
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


      const actualFolderFiles: any[] = []
      const userFiles: any[] = []
      //Creates the copy of the files and their userFiles
      for (const userFile of allFileAccess) {
        const file = userFile.File
        if ( !file.FileBin ) {
          let folderId = file.folderId
          if (!file.folderId || !foldersSet.has(file.folderId)){
            folderId = moveToId || null
          } else {
            folderId = folderOldToNew[folderId]
          }
          
          //Creates the copy of the file in the database
          const name = "copy " + file.name
          const created = await this.prisma.file.create({
            data:{
              folderId,
              ownerId: userId,
              modifyBy: userId,
              projectId: file.projectId,
              name,
              url: file.url,
              type: file.type,
            }
          })
          //Creates the copy of the file in supabase storage
          if (userFile.accessType == 'owner'){
            await this.storageService.copyFile(userId, `${file.id}.br`, `${created.id}.br`)
          } else {
            const ownerId = file['UserFile'][0]['userId']
            const download = await this.storageService.download(ownerId, `${file.id}.br`)
            await this.storageService.postFile(userId, `${created.id}.br`, download)
          }
          const size = await this.storageService.getFileSize(userId, `${created.id}.br`) || 0
          totalSize += size

          //Creates the userFiles
          const tempUserFile: any[] = []
          for ( const data of accessArray ){
            tempUserFile.push({
              ...data,
              fileId: created.id
            })
          }
          const owner = await this.prisma.userFile.create({
            data: {
              userId,
              fileId: created.id,
              accessType: 'owner',
            },
          })
          let otherUserFolders = await this.prisma.userFile.createManyAndReturn({
            data: tempUserFile
          })
          otherUserFolders = this.addUserInfo(userDict, otherUserFolders)

          userFiles.push({
            //ownerId: userId
            fileOwner: folderOwner,
            ...created,
            fileModifyBy: folderOwner,
            FileBin: null,
            UserFile: otherUserFolders,
            openedAt: owner.openedAt,
            size
          })

          const data = {
            ...created,
            UserFile:[{userId}]
          }

          if ( folderId == null || folderId == moveToId) {
            actualFolderFiles.push({
              ...data
            })
          } else if ( folderId ){
            const i = idToIndex[folderId]
            userFolders[i]
            userFolders[i]['size'] = userFolders[i]['size'] + size
            userFolders[i]['File'].push({
              ...data
            })
          }
        }
      }

      
      const actualFoldersleafs: any[] = []
      const folderTreeKey: any[] = []
      //Updates the folderId of the principal files
      let pathStack: any[] = []
      if( mainFolderId.length > 0 ) {
        let updatedFolders: any[] = []
        if ( moveToId ) {
          updatedFolders = await this.prisma.folder.updateManyAndReturn({
            where: { id: {in: mainFolderId} },
            data: { folderId: moveToId }
          })
        }
        const tempDict = updatedFolders.reduce((acc, folder) => {
          acc[folder.id] = folder
            return acc
        }, {})

        for( const mainId of mainFolderId ){
          actualFoldersleafs.push({id: mainId})
          if (moveToId) {
            const i = idToIndex[mainId]
            userFolders[i]['folderId'] = moveToId
            userFolders[i]['updatedAt'] = tempDict[mainId]["updatedAt"]
          }
          const oldId = folderNewToOld[mainId]
          const subFoldersId = folderTree[oldId]
          const updatedFolderIds: any[] = []
          for ( const folder of subFoldersId ){
            const copyId = folderOldToNew[folder.id]
            if ( copyId ){
              const i = idToIndex[mainId]
              const j = idToIndex[copyId]
              userFolders[i]['leaf'].push({id: copyId})
              userFolders[j]['folderId'] = mainId
              updatedFolderIds.push(copyId)
              if ( folderTree[folder.id].length > 0 ){
                pathStack.push(folder.id)
              }
            }
          }

          if ( updatedFolderIds.length > 0 ){
            folderTreeKey.push(mainId)
            const temp = await this.prisma.folder.updateManyAndReturn({
              where:{ id: { in: updatedFolderIds } },
              data: { folderId: mainId }
            })
            for(const data of temp){
              const i = idToIndex[data.id]
              userFolders[i]['updatedAt'] = data.updatedAt
            }
          }
        }
      }


      //Updates the folderId of the folders and file
      while (pathStack.length > 0) {
        const currentPath = pathStack.pop()
        const newId = folderOldToNew[currentPath]
        const subFoldersId = folderTree[currentPath]
        
        const updatedFolderIds: any[] = []
        for ( const folder of subFoldersId ){
          const copyId = folderOldToNew[folder.id]
          if ( copyId ) {
            const i = idToIndex[newId]
            const j = idToIndex[copyId]
            userFolders[i]['leaf'].push({id: copyId})
            userFolders[j]['folderId'] = newId
            updatedFolderIds.push(copyId)
            if ( folderTree[folder.id].length > 0 ){
              pathStack.push(folder.id)
            }
          }
        }

        if ( updatedFolderIds.length > 0 ){
          folderTreeKey.push(newId)
          const temp = await this.prisma.folder.updateManyAndReturn({
            where:{ id: { in: updatedFolderIds } },
            data: { folderId: newId }
          })

          for(const data of temp){
            const i = idToIndex[data.id]
            userFolders[i]['updatedAt'] = data.updatedAt
          }
        }
      }

      //Add the size of the folders inside a folder
      while (folderTreeKey.length > 0) {
        const currentPath = folderTreeKey.pop()
        const i = idToIndex[currentPath]
        const oldId = folderNewToOld[currentPath]
        const subFolders = folderTree[oldId] //Get the folders of a folder
        for (const folder of subFolders) {
          const copyId = folderOldToNew[folder.id]
          const j = idToIndex[copyId]
          userFolders[i]['size'] = userFolders[i]['size'] + userFolders[j]['size']
        }
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Folder duplicated successfully',
        updatedFathers,
        userFolders,
        userFiles,
        actualFoldersleafs,
        actualFolderFiles,
        totalSize
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
      throw new InternalServerErrorException('Error creating copy')
    }
  }
}
