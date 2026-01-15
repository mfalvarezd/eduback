import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { CreateNotificationDto } from './dto/create.notification.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class NotificationService {
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  async createNotification(userId: string, dto: CreateNotificationDto) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const { recieverId, header, content, type, extraData } = dto

      const transmitter = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      const receiver = await this.prisma.user.findUnique({
        where: { id: recieverId },
      })

      if (!transmitter) {
        throw new NotFoundException(`User with ID '${userId}' not found`)
      }

      if (!receiver) {
        throw new NotFoundException(`User with ID '${recieverId}' not found`)
      }

      // Crea la notificación utilizando los campos individuales
      const notification = await this.prisma.notification.create({
        data: {
          transmitterId: userId,
          recieverId,
          header,
          content,
          type,
          extraData,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Notification created successfully',
        notification,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error creating notification')
    }
  }

  async getNotificationByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const notifications = await this.prisma.notification.findMany({
        where: { recieverId: userId },
        include: {
          transmitter: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
              urlPhoto: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!notifications.length) {
        throw new NotFoundException(
          `No notification found for user with ID '${userId}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt(notifications)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        return ''
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException(
        'Error retrieving user notifications',
      )
    }
  }

  async updateNotification(notificationId: string, body: { read: boolean }) {
    try {
      const { read } = body
      if (!notificationId) {
        throw new BadRequestException('Notification ID is required')
      }
      if (read !== true && read !== false) {
        throw new BadRequestException('Read status is required')
      }

      const existingNotification = await this.prisma.notification.findUnique({
        where: { id: notificationId },
      })

      if (!existingNotification) {
        throw new NotFoundException('Notification not found')
      }

      const updatedNotification = await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          read,
          updatedAt: new Date(),
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Notification updated successfully',
        notification: updatedNotification,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        return ''
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating notification')
    }
  }

  async deleteNotification(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Notification ID is required')
      }

      const existingNotification = await this.prisma.notification.findUnique({
        where: { id },
      })

      if (!existingNotification) {
        throw new NotFoundException(`Notification with ID ${id} not found`)
      }

      await this.prisma.notification.delete({
        where: { id },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Notification deleted successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      if (error instanceof NotFoundException) {
        return ''
      }
      if (error instanceof BadRequestException) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error deleting notification')
    }
  }
}
