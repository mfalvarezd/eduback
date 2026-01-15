import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreateUserDeviceDto } from './dto/create.user-device.dto'
import { UpdateUserDeviceDto } from './dto/update.user-device.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class UserDeviceService {
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async createUserDevice(userId: string, dto: CreateUserDeviceDto) {
    try {
      const { device, deviceId } = dto

      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      if (!device) {
        throw new BadRequestException('Device is required')
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        throw new NotFoundException(`User with ID '${userId}' not found`)
      }

      const existing = await this.prisma.userDevice.findFirst({
        where: { userId, deviceId }
      })

      if (existing) {
        throw new ConflictException(`user already have the device ${deviceId}`)
      }

      const userDevice = await this.prisma.userDevice.create({
        data: {
          userId,
          device,
          deviceId,
        } as Prisma.UserDeviceUncheckedCreateInput,
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'User device created successfully',
        userDevice,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating user device')
    }
  }

  async getUserDeviceByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const devices = await this.prisma.userDevice.findMany({
        where: { userId },
      })

      if (!devices.length) {
        throw new NotFoundException(
          `No devices found for user with ID '${userId}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt(devices)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving user device')
    }
  }

  async updateDevice(
    userId: string,
    deviceId: string,
    updateData: UpdateUserDeviceDto,
  ) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!deviceId) {
        throw new BadRequestException('Device ID is required')
      }
      if (updateData.active === null){
        throw new BadRequestException("Active can't be send as null")
      }
      if (updateData.device === null){
        throw new BadRequestException("Device can't be send as null")
      }

      const device = await this.prisma.userDevice.findUnique({
        where: { id: deviceId },
      })
  
      if (!device) {
        throw new NotFoundException('Device not found')
      }
  
      if (device.userId !== userId) {
        throw new ForbiddenException('You do not have permission to update this device')
      }
  
      const updatedDevice = await this.prisma.userDevice.update({
        where: { id: deviceId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })
  
      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Device updated successfully',
        device: updatedDevice,
      })
  
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating device')
    }
  }
}
