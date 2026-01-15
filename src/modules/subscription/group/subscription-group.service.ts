import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CreateSubscriptionGroupDto } from './dto/create-subscription-group.dto'
import { UpdateSubscriptionGroupDto } from './dto/update-subscription-group.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'

@Injectable()
export class SubscriptionGroupService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createSubscriptionGroup(
    dto: CreateSubscriptionGroupDto,
    ownerId: string,
  ) {
    try {
      const { subscriptionId } = dto

      const subscriptionBase = await this.prisma.subscriptionBase.findFirst({
        where: {
          id: subscriptionId,
          //status: 'active',
        },
      })

      if (!subscriptionBase) {
        throw new NotFoundException(
          `Subscription Base not found with ID '${subscriptionId}'`,
        )
      }

      const ownerExists = await this.prisma.user.findUnique({
        where: {
          id: ownerId,
        },
      })

      if (!ownerExists) {
        throw new NotFoundException(`Owner not found with ID '${ownerId}'`)
      }

      const existingGroup = await this.prisma.subscriptionGroup.findFirst({
        where: {
          subscription: {
            id: subscriptionId,
          },
        },
      })

      if (existingGroup) {
        throw new ConflictException(
          `A group already exists for subscription '${subscriptionId}'`,
        )
      }

      const subscriptionGroup = await this.prisma.subscriptionGroup.create({
        data: {
          planId: subscriptionBase.id,
          ownerId,
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Subscription group created successfully',
        subscriptionGroup,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException(
        'Error creating subscription group',
      )
    }
  }

  async getAllSubscriptionGroups() {
    try {
      const groups = await this.prisma.subscriptionGroup.findMany({
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Subscription groups retrieved successfully',
        groups,
      })
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException(
        'Error retrieving subscription groups',
      )
    }
  }

  async getSubscriptionGroupById(id: string) {
    try {
      const group = await this.prisma.subscriptionGroup.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      if (!group) {
        throw new NotFoundException(
          `Subscription group not found with ID '${id}'`,
        )
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Subscription group retrieved successfully',
        group,
      })
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      throw new InternalServerErrorException(
        'Error retrieving subscription group',
      )
    }
  }

  async updateSubscriptionGroup(
    id: string,
    updateData: UpdateSubscriptionGroupDto,
  ) {
    try {
      const group = await this.prisma.subscriptionGroup.findUnique({
        where: { id },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      if (!group) {
        throw new NotFoundException(
          `Subscription group not found with ID '${id}'`,
        )
      }

      const {ownerId, planId} = updateData

      if(ownerId === null){
        throw new BadRequestException("OwnerId can't be send as null")
      }
      if(planId === null){
        throw new BadRequestException("PlanId can't be send as null")
      }

      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: ownerId,
        },
      })

      const subscriptionBase = await this.prisma.subscriptionBase.findFirst({
        where: {
          id: planId,
        },
      })

      const existingGroup = await this.prisma.subscriptionGroup.findFirst({
        where: {
          subscription: {
            id: planId,
          },
        },
      })

      if (!existingUser) {
        throw new NotFoundException(`User not found with ID '${ownerId}'`)
      }
      if (!subscriptionBase) {
        throw new NotFoundException(`Subscription Base not found with ID '${planId}'`)
      }
      if (existingGroup && existingGroup.id != id) {
        throw new ConflictException(`A group already exists for subscription '${planId}'`)
      }

      const updatedGroup = await this.prisma.subscriptionGroup.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
          owner: {
            select: {
              id: true,
              email: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Subscription group updated successfully',
        subscriptionGroup: updatedGroup,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException(
        'Error updating subscription group',
      )
    }
  }
}
