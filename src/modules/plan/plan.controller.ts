import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common'
import { PlanService } from './plan.service'
import { RegisterPlanDto } from './dto/register.plan.dto'
import { ClientInfo } from 'src/utils/client-info'
import { planLogger } from 'src/utils/logger'

@Controller('plans')
export class PlanController {
  constructor(private planService: PlanService) {}

  @Post()
  async createPlan(@Body() registerPlanDto: RegisterPlanDto, @Request() req) {
    planLogger.info(`Starting plan creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_PLAN',
      },
      request: {
        planName: registerPlanDto.name,
        description: registerPlanDto.description,
        maxUsers: registerPlanDto.maxUsers,
      },
    })

    const result = await this.planService.createPlan(registerPlanDto)

    planLogger.info(`Plan created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_PLAN_SUCCESS',
      },
      response: {
        planId: result.encryptedResponse.plan.id,
        planName: result.encryptedResponse.plan.name,
        description: result.encryptedResponse.plan.description,
        maxUsers: result.encryptedResponse.plan.maxUsers,
      },
    })

    return result
  }

  @Get()
  async getAllPlans(@Request() req) {
    planLogger.info(`Requesting all plans`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_PLANS',
      },
    })

    const result = await this.planService.getAllPlans()

    planLogger.info(`Plans retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_PLANS_SUCCESS',
      },
      response: {
        count: result.encryptedResponse.length,
      },
    })

    return result
  }

  @Get(':id')
  async getPlanById(@Param('id') id: string, @Request() req) {
    planLogger.info(`Requesting plan by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_PLAN',
      },
      request: {
        planId: id,
      },
    })

    const result = await this.planService.getPlanById(id)

    planLogger.info(`Plan retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_PLAN_SUCCESS',
      },
      response: {
        planId: id,
        planName: result.encryptedResponse.name,
        description: result.encryptedResponse.description,
        maxUsers: result.encryptedResponse.maxUsers,
      },
    })

    return result
  }
}
