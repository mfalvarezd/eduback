import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { SubscriptionBaseService } from './subscription-base.service'
import { CreateSubscriptionBaseDto } from './dto/create-subscription-base.dto'
import { subscriptionBaseLogger } from 'src/utils/logger'
import { UpdateSubscriptionBaseDto } from './dto/update-subscription-base.dto'
import { ClientInfo } from 'src/utils/client-info'
import { AuthGuard } from '@nestjs/passport'

@Controller('subscription-base')
export class SubscriptionBaseController {
  constructor(
    private readonly subscriptionBaseService: SubscriptionBaseService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('active')
  async getActiveSubscription(@Request() req) {
    console.log('Endpoint /active llamado')
    const userId = req.user.id
    console.log('ID del usuario autenticado:', userId)

    return await this.subscriptionBaseService.getActiveSubscriptionByUser(
      userId,
    )
  }

  @Get(':id')
  async getSubscriptionBaseById(@Param('id') id: string, @Request() req) {
    subscriptionBaseLogger.info(`Requesting base subscription by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_SUBSCRIPTION_BASE',
      },
      request: {
        subscriptionId: id,
      },
    })

    const result =
      await this.subscriptionBaseService.getSubscriptionBaseById(id)

    subscriptionBaseLogger.info(`Base subscription retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_SUBSCRIPTION_BASE_SUCCESS',
      },
      response: {
        subscriptionId: id,
      },
    })

    return result
  }
}
