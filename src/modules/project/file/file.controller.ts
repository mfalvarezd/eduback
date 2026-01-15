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
import { FileService } from './file.service'
//import { CollaboratorService } from '../collaborator/collaborator.service'
import { RegisterFileDto } from './dto/register.file.dto'
//import { RegisterCollaboratorDto } from '../collaborator/dto/register.collaborator.dto'
import { UpdateFileDto } from './dto/update.file.dto'
import { AuthGuard } from '@nestjs/passport'
//import { fileLogger } from 'src/utils/logger'
//import { ClientInfo } from 'src/utils/client-info'

@Controller('files')
export class FileController {
  constructor(
    private fileService: FileService,
    //private collaboratorService: CollaboratorService
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createFile(
    @Body() registerFileDto: RegisterFileDto,
    @Request() req,
  ) {
    const userId = req.user.id

    // fileLogger.info(`Starting file creation`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'CREATE_FILE',
    //   },
    //   request: {
    //     fileName: registerFileDto.name,
    //     userId,
    //   },
    // })

    const result = await this.fileService.createFile(registerFileDto, userId)

    // fileLogger.info(`File created successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'CREATE_FILE_SUCCESS',
    //   },
    //   response: {
    //     fileId: result.encryptedResponse.id,
    //     fileName: result.encryptedResponse.name,
    //     userId,
    //   },
    // })

    return result
  }

  @Post("fileBin/:id")
  @UseGuards(AuthGuard('jwt'))
  async createFileBin(
    @Param('id') fileId: string,
    @Request() req,
  ) {
    const userId = req.user.id
    // fileLogger.info(`Starting fileBin creation`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'CREATE_FILE_BIN',
    //   },
    //   request: {
    //     userId,
    //   },
    // })
    const result = await this.fileService.createFileBin(fileId, userId)
    // fileLogger.info(`FileBin created successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'CREATE_FILE_BIN_SUCCESS',
    //   },
    //   response: {
    //     fileBinId: result.encryptedResponse.id,
    //     userId,
    //   },
    // })
    return result
  }

  // @Post("collaborator")
  // @UseGuards(AuthGuard('jwt'))
  // async addCollaborator(
  //   @Body() data: RegisterCollaboratorDto,
  //   @Body('fileId') fileId: string,
  //   @Request() req,
  // ) {
  //   const userId = req.user.id
  //   const result = await this.collaboratorService.addFileCollaborator(userId, fileId, data)
  //   return result
  // }

  @Get()
  async getAllFiles(@Request() req) {
    // fileLogger.info(`Requesting all files`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_ALL_FILES',
    //   },
    // })
    const result = await this.fileService.getAllFiles()
    // fileLogger.info(`Files retrieved successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_ALL_FILES_SUCCESS',
    //   },
    //   response: {
    //     count: result.encryptedResponse.length,
    //   },
    // })
    return result
  }

  @Get('data/:id')
  async getFileById(@Param('id') id: string, @Request() req) {
    // fileLogger.info(`Requesting file by ID`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_FILE',
    //   },
    //   request: {
    //     fileId: id,
    //   },
    // })
    const result = await this.fileService.getFileById(id)
    // fileLogger.info(`File retrieved successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_FILE_SUCCESS',
    //   },
    //   response: {
    //     fileId: id,
    //     fileName: result.encryptedResponse.name,
    //   },
    // })
    return result
  }

  // @Get('download/:id')
  // async downloadFile(@Param('id') id: string, @Request() req) {
  //   const result = await this.fileService.downloadFile(id)
  //   return result
  // }

  @Get('of_user')
  @UseGuards(AuthGuard('jwt'))
  async getFileByUserId(@Request() req) {
    const userId = req.user.id
    // fileLogger.info(`Requesting files for user`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_FILES_FOR_USER',
    //   },
    //   request: {
    //     userId: userId,
    //   },
    // })
    const result = await this.fileService.getFileOfUser(userId)
    // fileLogger.info(`Files obtained successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'GET_FILES_FOR_USER_SUCCESS',
    //   },
    //   response: {
    //     count: result.encryptedResponse.length,
    //   },
    // })
    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateFile(
    @Param('id') id: string,
    @Body() body: UpdateFileDto,
    @Request() req,
  ) {
    const userId = req.user.id
    // fileLogger.info(`Updating file`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'UPDATE_FILE',
    //   },
    //   request: {
    //     fileId: id,
    //   },
    // })
    const result = await this.fileService.updateFile(id, userId, body)
    // fileLogger.info(`File updated successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'UPDATE_FILE_SUCCESS',
    //   },
    //   response: {
    //     fileId: id,
    //     fileName: result.encryptedResponse.name,
    //   },
    // })
    return result
  }

  // @Post('update_collaborator')
  // async updateCollaborator(
  //   @Request() req,
  //   @Body('userId') userId: string,
  //   @Body('fileId') fileId: string,
  //   @Body('accessType') accessType?: string,
  //   @Body('openedAt') openedAt?: Date,
  // ) {
  //   const result = await this.collaboratorService.updateFileCollaborator(fileId, userId, {accessType, openedAt})
  //   return result
  // }

  @Post('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteFile(@Param('id') id: string, @Request() req) {
    const userId = req.user.id
    // fileLogger.info(`Deleting file`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'DELETE_FILE',
    //   },
    //   request: {
    //     fileId: id,
    //   },
    // })
    const result = await this.fileService.deleteFile(id, userId)
    // fileLogger.info(`File deleted successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'DELETE_FILE_SUCCESS',
    //   },
    //   response: {
    //     fileId: id,
    //   },
    // })
    return result
  }

  @Post('remove_from_bin/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteFileBin(@Param('id') id: string, @Request() req) {
    const userId = req.user.id
    // fileLogger.info(`Deleting fileBin`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'DELETE_FILE_BIN',
    //   },
    //   request: {
    //     fileBinId: id,
    //   },
    // })
    const result = await this.fileService.deleteFileBin(id, userId)
    // fileLogger.info(`FileBin deleted successfully`, {
    //   metadata: {
    //     ...ClientInfo.getClientInfo(req),
    //     action: 'DELETE_FILE_BIN_SUCCESS',
    //   },
    //   response: {
    //     fileBinId: id,
    //   },
    // })
    return result
  }

  // @Post('delete_collaborator')
  // async deleteCollaborator(
  //   @Request() req,
  //   @Body('userId') userId: string,
  //   @Body('fileId') fileId: string,
  // ) {
  //   const result = await this.collaboratorService.deleteFileCollaborator(fileId, userId)
  //   return result
  // }

  @Post('duplicate')
  @UseGuards(AuthGuard('jwt'))
  async duplicateFile(
    @Request() req,
    @Body('fileId') fileId: string,
    @Body('folderId') folderId?: string,
  ) {
    const userId = req.user.id
    const result = await this.fileService.duplicateFile(userId, fileId, folderId)
    return result
  }
}
