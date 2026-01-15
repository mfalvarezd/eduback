import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Post,
  Req,
  Body,
  UseInterceptors,
  Delete,
  UploadedFile,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { AuthGuard } from '@nestjs/passport'
import { UpdateUserDto } from './dto/update-user.dto'
import { AuthService } from '../auth/auth.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { Express } from 'express'

interface RequestWithUser extends Request {
  user: any
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('company')
  async getCompany(@Req() req) {
    console.log(req.user) // Verifica qué datos están llegando en la solicitud
    return this.usersService.getCompanyByUser(req.user.id)
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  profile(@Request() req) {
    return this.usersService.getProfile(req.user)
  }

  @Get()
  async getAllUsers() {
    return await this.usersService.getAllUsers()
  }

  @Get(':id')
  async getUserById(@Param('id') id: string, @Request() req) {
    return await this.usersService.getUserById(id)
  }

  @Post('update')
  @UseGuards(AuthGuard('jwt'))
  async updateUser(@Request() req, @Body() updateUserDto: UpdateUserDto) {
    const userId = req.user.id
    return this.usersService.updateUser(userId, updateUserDto)
  }

  @Post('upload-image')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const userId = req.user.id
    return this.usersService.uploadImage(userId, file)
  }

  @Post('delete-image')
  @UseGuards(AuthGuard('jwt'))
  async deleteImage(@Request() req) {
    const userId = req.user.id
    return this.usersService.deleteImage(userId)
  }

  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string) {
    return await this.usersService.findByEmail(email)
  }

  @Post('deactivate')
  @UseGuards(AuthGuard('jwt'))
  async deactivateUser(@Request() req) {
    const userId = req.user.id
    return this.usersService.deactivateUser(userId)
  }
}
