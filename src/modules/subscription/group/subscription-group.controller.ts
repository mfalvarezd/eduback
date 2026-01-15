import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { SubscriptionGroupService } from './subscription-group.service'
import { CreateSubscriptionGroupDto } from './dto/create-subscription-group.dto'
import { UpdateSubscriptionGroupDto } from './dto/update-subscription-group.dto'
import { subscriptionGroupLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'
import { AuthGuard } from '@nestjs/passport'

@Controller('subscription-group')
export class SubscriptionGroupController {
  constructor(
    private readonly subscriptionGroupService: SubscriptionGroupService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createSubscriptionGroup(
    @Body() createSubscriptionGroupDto: CreateSubscriptionGroupDto,
    @Request() req,
  ) {
    const ownerId = req.user.id
    subscriptionGroupLogger.info(`Starting subscription group creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_SUBSCRIPTION_GROUP',
      },
      request: {
        subscriptionId: createSubscriptionGroupDto.subscriptionId,
        ownerId: ownerId,
      },
    })

    const result = await this.subscriptionGroupService.createSubscriptionGroup(
      createSubscriptionGroupDto,
      ownerId,
    )

    subscriptionGroupLogger.info(`Subscription group created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_SUBSCRIPTION_GROUP_SUCCESS',
      },
      response: {
        subscriptionGroupId: result.encryptedResponse?.subscriptionGroup?.id,
        planId: result.encryptedResponse?.subscriptionGroup?.planId,
        ownerId: result.encryptedResponse?.subscriptionGroup?.ownerId,
      },
    })

    return result
  }

  @Get()
  async getAllSubscriptionGroups(@Request() req) {
    subscriptionGroupLogger.info(`Requesting all subscription groups`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_SUBSCRIPTION_GROUPS',
      },
    })

    const result =
      await this.subscriptionGroupService.getAllSubscriptionGroups()

    subscriptionGroupLogger.info(`Subscription groups retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_SUBSCRIPTION_GROUPS_SUCCESS',
      },
      response: {
        count: result.encryptedResponse?.groups?.length || 0,
      },
    })

    return result
  }

  @Get(':id')
  async getSubscriptionGroupById(@Param('id') id: string, @Request() req) {
    subscriptionGroupLogger.info(`Requesting subscription group by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_SUBSCRIPTION_GROUP',
      },
      request: {
        subscriptionGroupId: id,
      },
    })

    const result =
      await this.subscriptionGroupService.getSubscriptionGroupById(id)

    subscriptionGroupLogger.info(`Subscription group retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_SUBSCRIPTION_GROUP_SUCCESS',
      },
      response: {
        subscriptionGroupId: result.encryptedResponse?.group?.id,
        planId: result.encryptedResponse?.group?.planId,
      },
    })

    return result
  }

  @Post('update/:id')
  async updateSubscriptionGroup(
    @Param('id') id: string,
    @Body() updateSubscriptionGroupDto: UpdateSubscriptionGroupDto,
    @Request() req,
  ) {
    subscriptionGroupLogger.info(`Starting subscription group update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_SUBSCRIPTION_GROUP',
      },
      request: {
        subscriptionGroupId: id,
        ...updateSubscriptionGroupDto,
      },
    })

    const result = await this.subscriptionGroupService.updateSubscriptionGroup(
      id,
      updateSubscriptionGroupDto,
    )

    subscriptionGroupLogger.info(`Subscription group updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_SUBSCRIPTION_GROUP_SUCCESS',
      },
      response: {
        subscriptionGroupId: result.encryptedResponse?.subscriptionGroup?.id,
        planId: result.encryptedResponse?.subscriptionGroup?.planId,
      },
    })

    return result
  }
}
