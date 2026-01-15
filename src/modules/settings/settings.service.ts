import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CreateSettingsDto } from './dto/create.settings.dto'
import { UpdateSettingsDto } from './dto/update.settings.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'

@Injectable()
export class SettingsService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createSetting(userId: string, dto: CreateSettingsDto) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const existingSetting = await this.prisma.setting.findUnique({
        where: { userId },
      })

      if (existingSetting) {
        throw new ConflictException(
          `Settings already exist for user with ID '${userId}'`,
        )
      }

      const setting = await this.prisma.setting.create({
        data: {
          userId,
          ...dto,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Settings created successfully',
        setting,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating settings')
    }
  }

  async getSettingByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const setting = await this.prisma.setting.findUnique({
        where: { userId },
      })

      if (!setting) {
        throw new NotFoundException(
          `Settings not found for user with ID '${userId}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt(setting)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving settings')
    }
  }

  async updateSetting(userId: string, updateData: UpdateSettingsDto) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const setting = await this.prisma.setting.findUnique({
        where: { userId },
      })

      if (!setting) {
        throw new NotFoundException(
          `Settings not found for user with ID '${userId}'`,
        )
      }

      const updatedSetting = await this.prisma.setting.update({
        where: { userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Settings updated successfully',
        setting: updatedSetting,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating settings')
    }
  }
}
