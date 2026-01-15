import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { RegisterPlanDto } from './dto/register.plan.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'

@Injectable()
export class PlanService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createPlan(data: RegisterPlanDto) {
    try {
      if (!data.name) {
        throw new BadRequestException('Plan name is required')
      }

      if (!data.maxUsers) {
        throw new BadRequestException('Maximum users is required')
      }

      const existingPlan = await this.prisma.plan.findFirst({
        where: { name: data.name },
      })

      if (existingPlan) {
        throw new ConflictException(
          `A plan with name '${data.name}' already exists`,
        )
      }

      const plan = await this.prisma.plan.create({
        data: {
          name: data.name,
          description: data.description,
          maxUsers: data.maxUsers,
        },
        include: {
          subscriptions: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Plan created successfully',
        plan,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating plan')
    }
  }

  async getAllPlans() {
    try {
      const plans = await this.prisma.plan.findMany({
        include: {
          subscriptions: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt(plans)
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving plans')
    }
  }

  async getPlanById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Plan ID is required')
      }

      const plan = await this.prisma.plan.findUnique({
        where: { id },
        include: {
          subscriptions: true,
        },
      })

      if (!plan) {
        throw new NotFoundException(`Plan with ID ${id} not found`)
      }

      const encryptedResponse = this.encryptionService.encrypt(plan)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving plan')
    }
  }
}
