import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { Multer } from 'multer'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { UpdateUserDto } from './dto/update-user.dto'
import { FirebaseImagesService } from 'src/utils/firebase-img/firebase-image.service'

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly firebaseImagesService: FirebaseImagesService,
  ) {}

  async getCompanyByUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { Company: { select: { id: true } } },
    })

    if (!user || !user.Company) {
      throw new NotFoundException('User does not belong to any company')
    }

    return { companyId: user.Company.id }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async findByUsername(userName: string) {
    return this.prisma.user.findUnique({ where: { userName } })
  }

  async getAllUsers() {
    const users = await this.prisma.user.findMany()
    const encryptedData = this.encryptionService.encrypt(users)
    return { encryptedData }
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new NotFoundException(`User with id '${id}' not found`)
    }

    const encryptedData = this.encryptionService.encrypt(user)
    return { encryptedData }
  }

  async getProfile(user: any) {
    const encryptedData = this.encryptionService.encrypt(user)
    return { encryptedData }
  }

  async updateUser(userId: string, updateData: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const { userName } = updateData

    if (userName === null)
      throw new BadRequestException("Username can't be send as null")

    if (updateData.role === null)
      throw new BadRequestException("Role can't be send as null")

    if (userName) {
      const existingUsername = await this.findByUsername(userName)

      if (existingUsername && existingUsername.id != userId) {
        throw new ConflictException('This username already exists')
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    })

    const response = {
      message: 'User updated successfully',
      user: user.email,
    }

    const encryptedResponse = this.encryptionService.encrypt(response)

    return { encryptedResponse }
  }

  async uploadImage(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided')
    }

    const publicUrl = await this.firebaseImagesService.uploadImage(userId, file)

    await this.prisma.user.update({
      where: { id: userId },
      data: { urlPhoto: publicUrl },
    })

    return { message: 'Image uploaded successfully', url: publicUrl }
  }

  async deleteImage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || !user.urlPhoto) {
      throw new BadRequestException('No image found')
    }

    await this.firebaseImagesService.deleteImage(user.urlPhoto)

    await this.prisma.user.update({
      where: { id: userId },
      data: { urlPhoto: null },
    })

    return { message: 'Image deleted successfully' }
  }

  async deactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!user.active) {
      throw new BadRequestException('User already deactivated')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        active: false,
        updatedAt: new Date(),
      },
    })

    const response = {
      message: 'User deactivated successfully',
      user: user.email,
    }

    const encryptedResponse = this.encryptionService.encrypt(response)

    return { encryptedResponse }
  }
}
