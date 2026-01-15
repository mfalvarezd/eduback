import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Query,
} from '@nestjs/common'
import { CollaboratorService } from './collaborator.service'
import { AuthGuard } from '@nestjs/passport'
import { RegisterCollaboratorDto } from './dto/register.collaborator.dto'
import { folderLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Controller('collaborators')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post('add-folder-collaborator')
  @UseGuards(AuthGuard('jwt'))
  async addFolderCollaborator(
    @Body() data: RegisterCollaboratorDto,
    @Request() req,
  ) {
    const userId = req.user.id
    return await this.collaboratorService.addFolderCollaborator(userId, data)
  }

  @Get('folder-invitation')
  @UseGuards(AuthGuard('jwt'))
  async processInvitation(@Query('token') token: string, @Request() req) {
    const userId = req.user.id
    return await this.collaboratorService.processFolderInvitation(token, userId)
  }

  @Post('generate-public-invitation')
  @UseGuards(AuthGuard('jwt'))
  async generatePublicInvitation(
    @Body('foldersId') foldersId: string[],
    @Body('filesId') filesId: string[],
    @Body('accessType') accessType: string,
    @Request() req,
  ) {
    const userId = req.user.id
    return await this.collaboratorService.generatePublicInvitationLink(
      userId,
      foldersId,
      filesId,
      accessType,
    )
  }

  @Post('delete-collaborator')
  @UseGuards(AuthGuard('jwt'))
  async deleteCollaborator(
    @Request() req,
    @Body('collaboratorId') collaboratorId: string,
    @Body('foldersId') foldersId?: Array<string>,
    @Body('filesId') filesId?: Array<string>,
  ) {
    const userId = req.user.id

    folderLogger.info(`Deleting collaborator`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_COLLABORATOR',
      },
      request: {
        userId,
        collaboratorId,
        foldersId,
        filesId,
      },
    })

    const result = await this.collaboratorService.deleteFolderCollaborator(
      userId,
      collaboratorId,
      foldersId,
      filesId,
    )

    folderLogger.info(`Collaborator deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_COLLABORATOR_SUCCESS',
      },
      response: {
        userId,
        collaboratorId,
        foldersId,
        filesId,
      },
    })

    return result
  }
}
