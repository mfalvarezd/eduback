import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common'
import { RegisterCollaboratorDto } from 'src/modules/project/collaborator/dto/register.collaborator.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'
import { MailService } from 'src/modules/mail/mail.service'

@Injectable()
export class CollaboratorService {
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private throwExceptions(error: any, message: string) {
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
    throw new InternalServerErrorException(message)
  }

  //Validates That user and collaborator exist.
  private async validateUsers(userId: string, collaboratorEmail: string) {
    const existingUserId = await this.prisma.user.findFirst({
      where: { id: userId, active: true },
    })
    if (!existingUserId) {
      throw new NotFoundException(`User with ID ${userId} not found`)
    }

    const existingCollaborator = await this.prisma.user.findFirst({
      where: { email: collaboratorEmail, active: true },
    })
    if (!existingCollaborator) {
      throw new NotFoundException(
        `User with email ${collaboratorEmail} not found`,
      )
    }

    return existingCollaborator
  }

  //Validates if user have permission to add collaborators and search if collaborator already have permissions.
  private async validatePermissions(
    permissionTable: any,
    filter: any,
    collaboratorfilter: any,
  ) {
    const existingPermission = await permissionTable.findFirst({
      where: filter,
    })
    if (!existingPermission || existingPermission.accessType == 'read') {
      throw new ForbiddenException(
        `You don't count with permission to add users`,
      )
    }

    const existingUserFile = await permissionTable.findFirst({
      where: collaboratorfilter,
    })
    return existingUserFile
  }

  //Validates if file with id exist
  private async existingFile(fileId: string) {
    const existingFile = await this.prisma.file.findFirst({
      where: { id: fileId, FileBin: null },
    })
    if (!existingFile) {
      throw new NotFoundException(`File with ID ${fileId} not found`)
    }
    return existingFile
  }

  //Validates if folder with id exist
  private async existingFolder(folderId: string) {
    const existingFolder = await this.prisma.folder.findFirst({
      where: { id: folderId, FolderBin: null },
    })
    if (!existingFolder) {
      throw new NotFoundException(`Folder with ID ${folderId} not found`)
    }
    return existingFolder
  }

  //Creates a UserFile data
  private async createUserFile(
    userId: string,
    fileId: string,
    accessType: string,
  ) {
    return await this.prisma.userFile.create({
      data: { userId, fileId, accessType },
    })
  }

  async addFileCollaborator(
    userId: string,
    fileId: string,
    data: RegisterCollaboratorDto,
  ) {
    try {
      const { collaboratorEmail, accessType } = data

      const existingCollaborator = await this.validateUsers(
        userId,
        collaboratorEmail,
      )

      await this.existingFile(fileId)

      const existingUserFile = await this.validatePermissions(
        this.prisma.userFile,
        { userId, fileId },
        { userId: existingCollaborator.id, fileId },
      )
      if (existingUserFile) {
        throw new ConflictException(
          `User with email: '${collaboratorEmail}' already has permission for file ID: '${fileId}'`,
        )
      }

      const userFile = await this.createUserFile(
        existingCollaborator.id,
        fileId,
        accessType,
      )

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Collaborator added successfully',
        userFile,
      })

      return { encryptedResponse }
    } catch (error) {
      this.throwExceptions(error, 'Error creating UserFile')
    }
  }

  async generatePublicInvitationLink(
    userId: string,
    foldersId: Array<string>,
    filesId: Array<string>,
    accessType: string,
  ): Promise<{ invitationLink: string }> {
    try {
      if (!foldersId && !filesId) {
        throw new BadRequestException(
          'Neither foldersId nor filesId were provided',
        )
      }

      if (accessType === 'owner') {
        throw new ConflictException(
          "Access type 'owner' cannot be used for public invitations",
        )
      }

      // Validar que el usuario existe
      const sender = await this.prisma.user.findFirst({
        where: { id: userId, active: true },
      })

      if (!sender) {
        throw new NotFoundException(`User with ID ${userId} not found`)
      }

      // Crear el token cifrado con la información de la invitación
      const token = this.encryptionService.encrypt({
        foldersId,
        filesId,
        accessType,
        senderEmail: sender.email,
      })

      // Generar el enlace público
      const invitationLink = `${process.env.FRONTEND_URL}/folder-invitation?token=${encodeURIComponent(
        token,
      )}`

      return { invitationLink }
    } catch (error) {
      this.throwExceptions(error, 'Error generating public invitation link')
    }

    // Agregar un return explícito para evitar que el tipo de retorno sea 'undefined'
    return { invitationLink: '' } // Valor por defecto en caso de error inesperado
  }

  async addFolderCollaborator(userId: string, data: RegisterCollaboratorDto) {
    try {
      const { collaboratorEmail, accessType, foldersId, filesId, message } =
        data
      console.log('Payload recibido:', { userId, data })

      if (accessType === 'owner') {
        throw new ConflictException("accessType can't be set to owner")
      }

      const sender = await this.prisma.user.findFirst({
        where: { id: userId },
      })

      if (!sender) {
        throw new NotFoundException(`User with id ${userId} not found`)
      }

      // Validar existencia del colaborador (aunque no se lo agregue todavía)
      const collaborator = await this.prisma.user.findFirst({
        where: { email: collaboratorEmail },
      })

      if (!collaborator) {
        throw new NotFoundException(
          `Collaborator with email ${collaboratorEmail} not found`,
        )
      }

      const token = this.encryptionService.encrypt({
        foldersId,
        filesId,
        accessType,
        recipientEmail: collaboratorEmail,
        senderEmail: sender.email,
      })

      await this.sendInvitationEmail(
        collaboratorEmail,
        foldersId?.[0] || '',
        accessType,
        `${sender.firstName} ${sender.lastName}`,
        message || 'Has sido invitado a colaborar en una carpeta.',
        token,
      )

      return {
        message: 'Invitation email sent successfully',
      }
    } catch (error) {
      this.throwExceptions(error, 'Error sending invitation')
    }
  }

  async sendInvitationEmail(
    recipientEmail: string,
    folderId: string,
    accessType: string,
    senderName: string,
    customMessage: string,
    token: string,
  ) {
    try {
      const invitationLink = `${process.env.FRONTEND_URL}/folder-invitation?token=${encodeURIComponent(
        token,
      )}`

      const emailContent = `
        <p>Hola,</p>
        <p><strong>${senderName}</strong> te ha invitado a colaborar en una carpeta.</p>
        <p><strong>Tipo de acceso:</strong> ${accessType}</p>
        ${customMessage ? `<p><strong>Mensaje:</strong> ${customMessage}</p>` : ''}
        <p>Puedes aceptar la invitación utilizando el siguiente enlace:</p>
        <p><a href="${invitationLink}">Haz clic aquí para aceptar la invitación</a></p>
        <p>Saludos,</p>
        <p>El equipo de SOLINAL</p>
      `

      await this.mailService.sendInvoiceEmail(
        recipientEmail,
        'Invitación para colaborar en una carpeta',
        emailContent,
      )
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al enviar el correo de invitación',
      )
    }
  }

  async processFolderInvitation(token: string, userId?: string) {
    try {
      console.log('Token recibido: ', token)
      const decryptedData = this.encryptionService.decrypt(
        decodeURIComponent(token),
      )

      const { foldersId, filesId, accessType, recipientEmail, senderEmail } =
        decryptedData

      // Determinar si es un enlace público o una invitación por correo
      let user
      if (recipientEmail) {
        // Caso: Invitación por correo
        user = await this.prisma.user.findFirst({
          where: { email: recipientEmail, active: true },
        })
        if (!user) {
          throw new NotFoundException(
            `User with email ${recipientEmail} not found`,
          )
        }
      } else if (userId) {
        // Caso: Enlace público
        user = await this.prisma.user.findFirst({
          where: { id: userId, active: true },
        })
        if (!user) {
          throw new NotFoundException(`User with ID ${userId} not found`)
        }
      } else {
        throw new BadRequestException(
          'Invalid token: neither recipientEmail nor userId provided',
        )
      }

      // Validar que el usuario que invita tiene permisos suficientes
      const inviter = await this.prisma.user.findFirst({
        where: { email: senderEmail, active: true },
      })
      if (!inviter) {
        throw new NotFoundException(`Inviting user not found`)
      }

      const userFolderArray = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId: inviter.id,
          accessType: { not: 'read' },
        },
      })
      const userFileArray = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId: inviter.id,
          accessType: { not: 'read' },
        },
      })

      if (
        (foldersId?.length || 0) !== userFolderArray.length ||
        (filesId?.length || 0) !== userFileArray.length
      ) {
        throw new ForbiddenException(
          `Inviting user does not have sufficient permissions`,
        )
      }

      // Procesar permisos para carpetas
      const existingFolders = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId: user.id,
          accessType: { not: 'owner' },
        },
      })
      const newUserFolderData: any[] = []
      const updatedUserFolderId: string[] = []
      const collFolderDict = existingFolders.reduce((acc, item) => {
        acc[item.folderId] = item
        return acc
      }, {})

      for (const userFolder of userFolderArray) {
        const folderId = userFolder.folderId
        if (collFolderDict[folderId]) {
          if (collFolderDict[folderId].accessType !== accessType) {
            updatedUserFolderId.push(folderId)
          }
        } else {
          newUserFolderData.push({
            folderId,
            userId: user.id,
            accessType,
          })
        }
      }

      if (newUserFolderData.length > 0) {
        await this.prisma.userFolder.createMany({
          data: newUserFolderData,
          skipDuplicates: true,
        })
      }

      if (updatedUserFolderId.length > 0) {
        await this.prisma.userFolder.updateMany({
          where: {
            folderId: { in: updatedUserFolderId },
            userId: user.id,
          },
          data: { accessType },
        })
      }

      // Procesar permisos para archivos
      const existingFiles = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId: user.id,
          accessType: { not: 'owner' },
        },
      })
      const newUserFileData: any[] = []
      const updatedUserFileId: string[] = []
      const collFileDict = existingFiles.reduce((acc, item) => {
        acc[item.fileId] = item
        return acc
      }, {})

      for (const userFile of userFileArray) {
        const fileId = userFile.fileId
        if (collFileDict[fileId]) {
          if (collFileDict[fileId].accessType !== accessType) {
            updatedUserFileId.push(fileId)
          }
        } else {
          newUserFileData.push({
            fileId,
            userId: user.id,
            accessType,
          })
        }
      }

      if (newUserFileData.length > 0) {
        await this.prisma.userFile.createMany({
          data: newUserFileData,
          skipDuplicates: true,
        })
      }

      if (updatedUserFileId.length > 0) {
        await this.prisma.userFile.updateMany({
          where: {
            fileId: { in: updatedUserFileId },
            userId: user.id,
          },
          data: { accessType },
        })
      }

      return {
        message: 'Invitation processed successfully',
        foldersId,
        filesId,
        accessType,
        user: user.email,
      }
    } catch (error) {
      console.error('Error procesando el token: ', error)
      throw new BadRequestException('Invalid or expired token')
    }
  }

  async updateFileCollaborator(
    id: string,
    userId: string,
    data: { accessType?: string; openedAt?: Date },
  ) {
    return await this.updateCollaborator(
      id,
      data,
      'UserFile',
      this.prisma.userFile,
      { fileId: id, userId },
    )
  }

  async updateFolderCollaborator(
    id: string,
    userId: string,
    data: { accessType?: string; openedAt?: Date },
  ) {
    return await this.updateCollaborator(
      id,
      data,
      'UserFolder',
      this.prisma.userFolder,
      { folderId: id, userId },
    )
  }

  async updateFolderAccessType(
    userId: string,
    collaboratorId: string,
    accessType: string,
    foldersId?: Array<string>,
    filesId?: Array<string>,
  ) {
    try {
      if (!userId) {
        throw new BadRequestException(`User ID is required`)
      }
      if (!accessType) {
        throw new BadRequestException(`accessType is required`)
      }
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }
      if (accessType == 'owner') {
        throw new ConflictException("accessType can't be updated to owner")
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId, active: true },
      })
      if (!existingUser) {
        throw new NotFoundException(`User with ID ${userId} not found`)
      }

      const userFolderArray = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId,
          accessType: { not: 'read' },
        },
      })
      const userFileArray = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId,
          accessType: { not: 'read' },
        },
      })

      const collaboratorFolder = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId: collaboratorId,
          accessType: { not: 'owner' },
        },
      })
      const collaboratorFile = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId: collaboratorId,
          accessType: { not: 'owner' },
        },
      })

      const userFoldersId: any[] = []
      const userFilesId: any[] = []

      const folderIds = new Set(collaboratorFolder.map((obj) => obj.folderId))
      const fileIds = new Set(collaboratorFile.map((obj) => obj.fileId))

      for (const userfolder of userFolderArray) {
        if (folderIds.has(userfolder.folderId)) {
          userFoldersId.push(userfolder.folderId)
        }
      }
      for (const userfile of userFileArray) {
        if (fileIds.has(userfile.fileId)) {
          userFilesId.push(userfile.fileId)
        }
      }

      let updatedUserFolders: any[] = []
      let updatedUserFiles: any[] = []

      if (userFoldersId.length > 0) {
        updatedUserFolders = await this.prisma.userFolder.updateManyAndReturn({
          where: {
            folderId: { in: userFoldersId },
            userId: collaboratorId,
          },
          data: { accessType },
        })
      }
      if (userFilesId.length > 0) {
        updatedUserFiles = await this.prisma.userFile.updateManyAndReturn({
          where: {
            fileId: { in: userFilesId },
            userId: collaboratorId,
          },
          data: { accessType },
        })
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Collaborator updated successfully',
        updatedUserFolders,
        updatedUserFiles,
      })

      return { encryptedResponse }
    } catch (error) {
      this.throwExceptions(error, 'Error updating the collaborator')
    }
  }

  private async updateCollaborator(
    id: string,
    data: { accessType?: string; openedAt?: Date },
    tableName: string,
    table: any,
    filter: any,
  ) {
    try {
      const format = tableName.replace(/^User/, '')
      if (!id) {
        throw new BadRequestException(`${format} ID is required`)
      }
      if (!filter.userId) {
        throw new BadRequestException(`User ID is required`)
      }

      const existingPermission = await table.findMany({
        where: filter,
      })
      if (existingPermission.length <= 0) {
        throw new NotFoundException(`${tableName} not found`)
      }

      let { accessType, openedAt } = data

      if (accessType === null) {
        accessType = existingPermission[0].accessType
      }
      if (openedAt === null) {
        openedAt = existingPermission[0].openedAt
      }

      if (
        existingPermission[0].accessType != 'owner' &&
        accessType == 'owner'
      ) {
        throw new ConflictException(`AccessType can't be updated to owner`)
      }

      const dataUpdated = await table.updateManyAndReturn({
        where: filter,
        data: {
          accessType,
          openedAt,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Collaborator updated successfully',
        dataUpdated,
      })

      return { encryptedResponse }
    } catch (error) {
      this.throwExceptions(error, 'Error updating the collaborator')
    }
  }

  async deleteFileCollaborator(id: string, userId: string) {
    return await this.deleteCollaborator(id, 'UserFile', this.prisma.userFile, {
      fileId: id,
      userId,
    })
  }

  async deleteFolderCollaborator(
    userId: string,
    collaboratorId: string,
    foldersId?: Array<string>,
    filesId?: Array<string>,
  ) {
    try {
      if (!foldersId && !filesId) {
        throw new BadRequestException('Neither foldersId nor filesId were send')
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId, active: true },
      })

      if (!existingUser) {
        throw new NotFoundException(`User with ID ${userId} not found`)
      }

      const userFolderArray = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId,
          accessType: { not: 'read' },
        },
      })
      const userFileArray = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId,
          accessType: { not: 'read' },
        },
      })

      const collaboratorFolder = await this.prisma.userFolder.findMany({
        where: {
          folderId: { in: foldersId },
          userId: collaboratorId,
          accessType: { not: 'owner' },
        },
      })
      const collaboratorFile = await this.prisma.userFile.findMany({
        where: {
          fileId: { in: filesId },
          userId: collaboratorId,
          accessType: { not: 'owner' },
        },
      })

      const deleteFoldersId: any[] = []
      const deleteFilesId: any[] = []
      const collaboratorUserFolderIds = new Set(
        collaboratorFolder.map((obj) => obj.folderId),
      )
      const collaboratorUserFileIds = new Set(
        collaboratorFile.map((obj) => obj.fileId),
      )

      for (const userfolder of userFolderArray) {
        if (collaboratorUserFolderIds.has(userfolder.folderId)) {
          deleteFoldersId.push(userfolder.folderId)
        }
      }
      for (const userfile of userFileArray) {
        if (collaboratorUserFileIds.has(userfile.fileId)) {
          deleteFilesId.push(userfile.fileId)
        }
      }

      if (deleteFoldersId.length > 0) {
        await this.prisma.userFolder.deleteMany({
          where: {
            folderId: { in: deleteFoldersId },
            userId: collaboratorId,
          },
        })
      }
      if (deleteFilesId.length > 0) {
        await this.prisma.userFile.deleteMany({
          where: {
            fileId: { in: deleteFilesId },
            userId: collaboratorId,
          },
        })
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Collaborator deleted successfully',
        deleteFoldersId,
        deleteFilesId,
      })

      return { encryptedResponse }
    } catch (error) {
      this.throwExceptions(error, 'Error deleting userFolder')
    }
  }

  private async deleteCollaborator(
    id: string,
    tableName: string,
    table: any,
    filter: any,
  ) {
    try {
      const format = tableName.replace(/^User/, '')
      if (!id) {
        throw new BadRequestException(`${format} ID is required`)
      }
      if (!filter.userId) {
        throw new BadRequestException(`User ID is required`)
      }

      const existingPermission = await table.findMany({
        where: filter,
      })

      if (existingPermission.length <= 0) {
        throw new NotFoundException(`${tableName} not found`)
      }
      if (existingPermission[0].accessType == 'owner') {
        throw new ConflictException(`Owner can't be removed`)
      }

      await table.deleteMany({
        where: filter,
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Collaborator deleted successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      this.throwExceptions(error, 'Error deleting Collaborator')
    }
  }
}
