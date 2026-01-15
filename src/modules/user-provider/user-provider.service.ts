import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CreateUserProviderDto } from './dto/create-user-provider.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'

@Injectable()
export class UserProviderService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createUserProvider(userId: string, dto: CreateUserProviderDto) {
    try {
      const { provider, providerId } = dto

      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      if (!provider) {
        throw new BadRequestException('Provider is required')
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        throw new NotFoundException(`User with ID '${userId}' not found`)
      }

      const existing = await this.prisma.userProvider.findFirst({
        where: { userId, provider },
      })

      if (existing) {
        throw new ConflictException(
          `A provider already exists for this user with provider '${provider}'`,
        )
      }

      const userProvider = await this.prisma.userProvider.create({
        data: {
          userId,
          provider,
          providerId,
        },
        include: {
          user: { select: { id: true, email: true } },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'User provider created successfully',
        userProvider,
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
      throw new InternalServerErrorException('Error creating user provider')
    }
  }

  async getUserProvidersByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const providers = await this.prisma.userProvider.findMany({
        where: { userId },
        include: {
          user: { select: { id: true, email: true } },
        },
      })

      if (!providers.length) {
        throw new NotFoundException(
          `No providers found for user with ID '${userId}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt(providers)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving user providers')
    }
  }
}
