import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Req,
} from '@nestjs/common'
import { FolderService } from './folder.service'
//import { CollaboratorService } from '../collaborator/collaborator.service'
import { RegisterFolderDto } from './dto/register.folder.dto'
//import { RegisterCollaboratorDto } from '../collaborator/dto/register.collaborator.dto'
import { UpdateFolderDto } from './dto/update.folder.dto'
import { AuthGuard } from '@nestjs/passport'
import { folderLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Controller('folders')
export class FolderController {
  constructor(
    private folderService: FolderService,
    //private collaboratorService: CollaboratorService
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createFolder(
    @Body() registerFolderDto: RegisterFolderDto,
    @Request() req,
  ) {
    const userId = req.user.id

    const folderData = {
      ...registerFolderDto,
      ownerId: userId,
      isTeam: false,
    }

    folderLogger.info(`Starting folder creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_FOLDER',
      },
      request: {
        folderName: registerFolderDto.name,
        userId: userId,
      },
    })

    const result = await this.folderService.createFolder(folderData, userId)

    folderLogger.info(`Folder created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_FOLDER_SUCCESS',
      },
      response: {
        folderId: result.encryptedResponse.id,
        folderName: result.encryptedResponse.name,
        userId: userId,
      },
    })

    return result
  }

  @Post('teams')
  @UseGuards(AuthGuard('jwt'))
  async createTeam(@Body('name') name: string, @Request() req) {
    const userId = req.user.id

    folderLogger.info(`Starting team creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_TEAM',
      },
      request: {
        folderName: name,
        userId: userId,
      },
    })

    const result = await this.folderService.createTeam(name, userId)

    folderLogger.info(`Team created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_TEAM_SUCCESS',
      },
      response: {
        folderId: result.encryptedResponse.id,
        folderName: result.encryptedResponse.name,
        userId: userId,
      },
    })

    return result
  }

  @Post('folderBin')
  @UseGuards(AuthGuard('jwt'))
  async createFolderBin(
    @Body('foldersId') foldersId: Array<string>,
    @Body('filesId') filesId: Array<string>,
    @Request() req,
  ) {
    const userId = req.user.id
    folderLogger.info(`Starting folder bin creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_FOLDER_BIN',
      },
      request: {
        foldersId,
        filesId,
        userId: userId,
      },
    })
    const result = await this.folderService.createFolderBin(
      userId,
      foldersId,
      filesId,
    )
    folderLogger.info(`Folder bin created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_FOLDER_BIN_SUCCESS',
      },
      response: {
        userId: userId,
      },
    })
    return result
  }

  // @Post("collaborator")
  // @UseGuards(AuthGuard('jwt'))
  // async addCollaborator(
  //   @Body() data: RegisterCollaboratorDto,
  //   @Body('foldersId') foldersId: Array<string>,
  //   @Body('filesId') filesId: Array<string>,
  //   @Request() req,
  // ) {
  //   const userId = req.user.id
  //   folderLogger.info(`Starting userFolder creation`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'CREATE_USER_FOLDER',
  //     },
  //     request: {
  //       foldersId,
  //       filesId,
  //       collaboratorEmail: data.collaboratorEmail,
  //       userId: userId,
  //     },
  //   })
  //   const result = await this.collaboratorService.addFolderCollaborator(userId, data, foldersId, filesId)
  //   folderLogger.info(`Collaborator created successfully`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'CREATE_FOLDER_FOLDER_SUCCESS',
  //     },
  //     response: {
  //       userId: userId,
  //     },
  //   })
  //   return result
  // }

  @Get()
  async getAllFolders(@Request() req) {
    folderLogger.info(`Requesting all folders`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_FOLDERS',
      },
    })

    const result = await this.folderService.getAllFolders()

    folderLogger.info(`Folders retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_FOLDERS_SUCCESS',
      },
      response: {
        count: result.encryptedResponse.length,
      },
    })

    return result
  }

  @Get('data/:id')
  async getFolderById(@Param('id') id: string, @Request() req) {
    folderLogger.info(`Requesting folder by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_FOLDER',
      },
      request: {
        folderId: id,
      },
    })

    const result = await this.folderService.getFolderById(id)

    folderLogger.info(`Folder retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_FOLDER_SUCCESS',
      },
      response: {
        folderId: id,
        folderName: result.encryptedResponse.name,
      },
    })

    return result
  }

  @Get('of_user')
  @UseGuards(AuthGuard('jwt'))
  async getFolderByUserId(@Request() req) {
    const userId = req.user.id
    const result = await this.folderService.getFolderOfUser(userId)
    return result
  }

  @Get('in_bin')
  @UseGuards(AuthGuard('jwt'))
  async getFolderInBin(@Request() req) {
    const userId = req.user.id
    const result = await this.folderService.getFolderInBin(userId)
    return result
  }

  @Get('directory')
  @UseGuards(AuthGuard('jwt'))
  async getDirectory(@Request() req) {
    const userId = req.user.id
    const result = await this.folderService.getDirectory(userId)
    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateFolder(
    @Param('id') id: string,
    @Body() body: UpdateFolderDto,
    @Request() req,
  ) {
    const userId = req.user.id
    folderLogger.info(`Updating folder`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_FOLDER',
      },
      request: {
        folderId: id,
        userId, //usuario que hace la modificación de la carpeta
      },
    })
    const result = await this.folderService.updateFolder(id, userId, body)

    folderLogger.info(`Folder updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_FOLDER_SUCCESS',
      },
      response: {
        folderId: id,
        folderName: result.encryptedResponse.name,
      },
    })
    return result
  }

  @Post('teamsUpdate/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateTeam(
    @Param('id') id: string,
    @Body('name') name: string,
    @Request() req,
  ) {
    const userId = req.user.id
    folderLogger.info(`Updating team`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_TEAM',
      },
      request: {
        folderId: id,
      },
    })
    const result = await this.folderService.updateTeam(id, userId, name)
    folderLogger.info(`Team updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_TEAM_SUCCESS',
      },
      response: {
        folderId: id,
        folderName: result.encryptedResponse.name,
      },
    })
    return result
  }

  // @Post('update_collaborator')
  // async updateCollaborator(
  //   @Request() req,
  //   @Body('userId') userId: string,
  //   @Body('folderId') folderId: string,
  //   @Body('accessType') accessType?: string,
  //   @Body('openedAt') openedAt?: Date,
  // ) {
  //   folderLogger.info(`Updating userFolder`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'UPDATE_USER_FOLDER',
  //     },
  //     request: {
  //       userId,
  //       folderId,
  //     },
  //   })
  //   const result = await this.collaboratorService.updateFolderCollaborator(folderId, userId, {accessType, openedAt})
  //   folderLogger.info(`UserFolder updated successfully`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'UPDATE_USER_FOLDER_SUCCESS',
  //     },
  //     response: {
  //       userId,
  //       folderId,
  //     },
  //   })
  //   return result
  // }

  // @Post('update_accessType')
  // @UseGuards(AuthGuard('jwt'))
  // async updateAccesType(
  //   @Request() req,
  //   @Body('collaboratorId') collaboratorId: string,
  //   @Body('accessType') accessType: string,
  //   @Body('foldersId') foldersId?: Array<string>,
  //   @Body('filesId') filesId?: Array<string>,
  // ) {
  //   const userId = req.user.id
  //   folderLogger.info(`Updating userFolder`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'UPDATE_USER_FOLDER',
  //     },
  //     request: {
  //       userId,
  //       foldersId,
  //       filesId,
  //     },
  //   })
  //   const result = await this.collaboratorService.updateFolderAccessType(userId, collaboratorId, accessType, foldersId, filesId)
  //   folderLogger.info(`UserFolder updated successfully`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'UPDATE_USER_FOLDER_SUCCESS',
  //     },
  //     response: {
  //       userId,
  //       foldersId,
  //       filesId,
  //     },
  //   })
  //   return result
  // }

  @Post('delete')
  async deleteFolder(
    @Body('foldersId') foldersId: Array<string>,
    @Body('filesId') filesId: Array<string>,
    @Request() req,
  ) {
    folderLogger.info(`Deleting folder`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_FOLDER',
      },
      request: {
        foldersId,
        filesId,
      },
    })
    const result = await this.folderService.deleteFolder(foldersId, filesId)
    folderLogger.info(`Folder deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_FOLDER_SUCCESS',
      },
      response: {
        foldersId,
        filesId,
      },
    })
    return result
  }

  @Post('teamsDelete')
  async deleteTeam(
    @Body('teamId') teamId: string,
    @Body('foldersId') foldersId: Array<string>,
    @Body('filesId') filesId: Array<string>,
    @Request() req,
  ) {
    folderLogger.info(`Deleting team`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_TEAM',
      },
      request: {
        teamId,
        foldersId,
        filesId,
      },
    })
    const result = await this.folderService.deleteTeam(
      teamId,
      foldersId,
      filesId,
    )
    folderLogger.info(`Team deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_TEAM_SUCCESS',
      },
      response: {
        teamId,
      },
    })
    return result
  }

  @Post('remove_from_bin')
  async deleteFolderBin(
    @Body('foldersId') foldersId: Array<string>,
    @Body('filesId') filesId: Array<string>,
    @Request() req,
  ) {
    folderLogger.info(`Deleting folder bin`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_FOLDER_BIN',
      },
      request: {
        foldersId,
        filesId,
      },
    })
    const result = await this.folderService.deleteFolderBin(foldersId, filesId)
    folderLogger.info(`folder bin deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_FOLDER_BIN_SUCCESS',
      },
      response: {
        foldersId,
        filesId,
      },
    })
    return result
  }

  // @Post('delete_collaborator')
  // @UseGuards(AuthGuard('jwt'))
  // async deleteCollaborator(
  //   @Request() req,
  //   @Body('collaboratorId') collaboratorId: string,
  //   @Body('foldersId') foldersId?: Array<string>,
  //   @Body('filesId') filesId?: Array<string>,
  // ) {
  //   const userId = req.user.id
  //   folderLogger.info(`Deleting collaborator`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'DELETE_COLLABORATOR',
  //     },
  //     request: {
  //       userId,
  //       collaboratorId,
  //       foldersId,
  //       filesId,
  //     },
  //   })
  //   const result = await this.collaboratorService.deleteFolderCollaborator(userId, collaboratorId, foldersId, filesId)
  //   folderLogger.info(`Collaborator deleted successfully`, {
  //     metadata: {
  //       ...ClientInfo.getClientInfo(req),
  //       action: 'DELETE_COLLABORATOR_SUCCESS',
  //     },
  //     response: {
  //       userId,
  //       collaboratorId,
  //       foldersId,
  //       filesId,
  //     },
  //   })
  //   return result
  // }

  @Post('duplicate')
  @UseGuards(AuthGuard('jwt'))
  async duplicateFolder(
    @Request() req,
    @Body('moveToId') moveToId?: string,
    @Body('foldersId') foldersId?: Array<string>,
    @Body('filesId') filesId?: Array<string>,
  ) {
    const userId = req.user.id
    const result = await this.folderService.duplicateFolder(
      userId,
      moveToId,
      foldersId,
      filesId,
    )
    return result
  }
}
