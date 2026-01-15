import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { RegisterGroupUserDto } from './dto/register.group-user.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'

@Injectable()
export class GroupUserService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async addMember(data: RegisterGroupUserDto) {
    try {
      const { groupId, userId } = data

      const groupExists = await this.prisma.subscriptionGroup.findUnique({
        where: { id: groupId },
        include: {
          members: true,
        },
      })

      if (!groupExists) {
        throw new NotFoundException(`Group with ID: '${groupId}' not found`)
      }

      const userExists = await this.prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        throw new NotFoundException(`User with ID: '${userId}' not found`)
      }

      const existingMember = await this.prisma.groupUser.findFirst({
        where: {
          groupId,
          userId,
        },
      })

      if (existingMember) {
        throw new ConflictException(
          `User with ID: '${userId}' is already a member of group ID: '${groupId}'`,
        )
      }

      const groupUser = await this.prisma.groupUser.create({
        data: {
          groupId,
          userId,
        },
        include: {
          group: true,
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Member added to group successfully',
        groupUser,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error adding member to group')
    }
  }

  async getGroupMembers(groupId: string) {
    try {
      const group = await this.prisma.subscriptionGroup.findUnique({
        where: { id: groupId },
      })

      if (!group) {
        throw new NotFoundException(`Group with ID: '${groupId}' not found`)
      }

      const members = await this.prisma.groupUser.findMany({
        where: { groupId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt(members)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving group members')
    }
  }

  async removeGroupMember(groupId: string, userId: string) {
    try {
      const groupExists = await this.prisma.subscriptionGroup.findUnique({
        where: { id: groupId },
      })

      if (!groupExists) {
        throw new NotFoundException(`Group with ID: '${groupId}' not found`)
      }

      const memberExists = await this.prisma.groupUser.findFirst({
        where: {
          groupId,
          userId,
        },
      })

      if (!memberExists) {
        throw new NotFoundException(
          `User with ID: '${userId}' is not a member of group ID: '${groupId}'`,
        )
      }

      await this.prisma.groupUser.delete({
        where: {
          id: memberExists.id,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Member removed from group successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException('Error removing member from group')
    }
  }
}
