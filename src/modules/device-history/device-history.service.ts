import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common'
import { CreateDeviceHistoryDto } from './dto/create.device-history.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { PrismaService } from 'prisma/prisma.service'
import { UAParser } from 'ua-parser-js'
import * as crypto from 'crypto'
@Injectable()
export class DeviceHistoryService {
  constructor(
    private encryptionService: EncryptionService,
    private readonly prisma: PrismaService,
  ) {}

  getDeviceInfo(req: Request) {
    const parser = new UAParser(req.headers['user-agent'])
    const os = parser.getOS()
    const browser = parser.getBrowser()
    const device = `${os.name} ${os.version || ''}`.trim()
    const webBrowser = `${browser.name} ${browser.version || ''}`.trim()

    return { device, webBrowser }
  }

  async createDeviceHistory(userId: string, dto: CreateDeviceHistoryDto) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!dto.device || !dto.webBrowser || !dto.address) {
        throw new BadRequestException(
          'Device, webBrowser, and address are required',
        )
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        throw new NotFoundException(`User with ID '${userId}' not found`)
      }

      const existingHistory = await this.prisma.deviceHistory.findFirst({
        where: {
          userId,
          device: dto.device,
          webBrowser: dto.webBrowser,
          address: dto.address,
        },
      })

      if (existingHistory) {
        const updatedHistory = await this.prisma.deviceHistory.update({
          where: { id: existingHistory.id },
          data: {
            status: 'Sesión actual',
            updatedAt: new Date(),
          },
        })
        return {
          encryptedResponse: this.encryptionService.encrypt({
            message: 'Device session updated',
            deviceHistory: updatedHistory,
          }),
        }
      }

      const deviceHistory = await this.prisma.deviceHistory.create({
        data: {
          userId,
          ...dto,
          status: 'Sesión actual',
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Device history created successfully',
        deviceHistory,
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
      throw new InternalServerErrorException(
        'Error creating user device history',
      )
    }
  }

  async getDeviceHistoryByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const history = await this.prisma.deviceHistory.findMany({
        where: { userId },
      })

      if (!history.length) {
        throw new NotFoundException(
          `No device history found for user with ID '${userId}'`,
        )
      }

      // Formatear la respuesta
      const formattedHistory = history.map((entry) => ({
        dispositivo: `${entry.webBrowser}, ${entry.device}`,
        ultimoAcceso: entry.updatedAt.toLocaleString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        ubicacion: entry.address,
        estado: entry.status,
      }))

      // Cifrar la respuesta formateada
      const encryptedResponse = this.encryptionService.encrypt(formattedHistory)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException(
        'Error retrieving user device history',
      )
    }
  }

  async updateDeviceHistory(deviceHistoryId: string, body: { status: string }) {
    try {
      const { status } = body

      if (!deviceHistoryId) {
        throw new BadRequestException('Device history ID is required')
      }
      if (!status) {
        throw new BadRequestException('Status is required')
      }

      const deviceHistory = await this.prisma.deviceHistory.findUnique({
        where: { id: deviceHistoryId },
      })

      if (!deviceHistory) {
        throw new NotFoundException('Device history not found')
      }

      const updatedhistory = await this.prisma.deviceHistory.update({
        where: { id: deviceHistoryId },
        data: {
          status,
          updatedAt: new Date(),
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Device history updated successfully',
        deviceHistory: updatedhistory,
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
      throw new InternalServerErrorException('Error updating device history')
    }
  }
}
