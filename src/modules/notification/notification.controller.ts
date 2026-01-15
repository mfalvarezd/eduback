import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { NotificationService } from './notification.service'
import { CreateNotificationDto } from './dto/create.notification.dto'
import { AuthGuard } from '@nestjs/passport'
// import { notificationLogger } from 'src/utils/logger'
// import { ClientInfo } from 'src/utils/client-info'

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('create')
  @UseGuards(AuthGuard('jwt'))
  async createNotification(
    @Body() createDto: CreateNotificationDto,
    @Request() req,
  ) {
    const userId = req.user.id
    /*notificationLogger.info(`Starting notification creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_NOTIFICATION',
      },
      request: {
        userId,
        ...createDto,
      },
    })*/

    const result = await this.notificationService.createNotification(
      userId,
      createDto,
    )

    /*notificationLogger.info(`Notification created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_NOTIFICATION_SUCCESS',
      },
      response: {
        notificationId: result.encryptedResponse.notification.id,
        userId: result.encryptedResponse.notification.transmitterId,
      },
    })*/

    return result
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getNotificationsByUserId(@Request() req) {
    const userId = req.user.id

    /*notificationLogger.info(`Requesting notifications`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_NOTIFICATION',
      },
      request: {
        userId,
      },
    })*/

    const result =
      await this.notificationService.getNotificationByUserId(userId)

    /*notificationLogger.info(`Notifications retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_NOTIFICATION_SUCCESS',
      },
      response: {
        userId,
        count: result.encryptedResponse.length || 0,
      },
    })*/

    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateNotification(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { read: boolean },
  ) {
    /*notificationLogger.info(`Starting notification update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_NOTIFICATION',
      },
      request: {
        notificationId: id,
        ...body,
      },
    })*/

    const result = await this.notificationService.updateNotification(id, body)

    /*notificationLogger.info(`Notification updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_NOTIFICATION_SUCCESS',
      },
      response: {
        notificationId: result.encryptedResponse?.notification?.id,
      },
    })*/

    return result
  }

  @Post('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteNotification(@Param('id') id: string, @Request() req) {
    /*notificationLogger.info(`Deleting notification`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_NOTIFICATION',
      },
      request: {
        notificationId: id,
      },
    })*/

    const result = await this.notificationService.deleteNotification(id)

    /*notificationLogger.info(`Notification deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_NOTIFICATION_SUCCESS',
      },
      response: {
        notificationId: id,
      },
    })*/
    return result
  }
}
