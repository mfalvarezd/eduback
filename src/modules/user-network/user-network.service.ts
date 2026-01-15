import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CreateUserNetworkDto } from './dto/create.user-network.dto'
import { UpdateUserNetworkDto } from './dto/updates.user-network.dto'
import { EncryptionService } from '../../utils/encryption/encryption.service'

@Injectable()
export class UserNetworkService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createUserNetwork(userId: string, dto: CreateUserNetworkDto) {
    try {
      const { network } = dto

      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      if (!network) {
        throw new BadRequestException('Network is required')
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        throw new NotFoundException(`User with ID '${userId}' not found`)
      }

      const existing = await this.prisma.userNetwork.findUnique({
        where: { userId },
      })

      if (existing) {
        throw new ConflictException(
          `User already has a network`,
        )
      }

      const userNetwork = await this.prisma.userNetwork.create({
        data: {
          userId,
          network,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'User network created successfully',
        userNetwork,
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
      throw new InternalServerErrorException('Error creating user network')
    }
  }

  async getUserNetworkByUserId(userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }

      const networks = await this.prisma.userNetwork.findMany({
        where: { userId },
      })

      if (!networks.length) {
        throw new NotFoundException(
          `No networks found for user with ID '${userId}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt(networks)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving user network')
    }
  }

  async updateNetwork(userId: string, updateDto: UpdateUserNetworkDto) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (updateDto.network === null){
        throw new BadRequestException("Network can't be send as null")
      }
      if (updateDto.connection === null){
        throw new BadRequestException("Connection can't be send as null")
      }

      const network = await this.prisma.userNetwork.findUnique({
        where: { userId },
      })

      if (!network) {
        throw new NotFoundException(`Network not found for user with ID '${userId}'`)
      }

      const updatedNetwork = await this.prisma.userNetwork.update({
        where: { userId },
        data: {
          ...updateDto,
          updatedAt: new Date(),
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Network updated successfully',
        setting: updatedNetwork,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating network')
    }
  }
}
