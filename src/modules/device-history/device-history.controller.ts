import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { DeviceHistoryService } from './device-history.service'
import { CreateDeviceHistoryDto } from './dto/create.device-history.dto'
import { AuthGuard } from '@nestjs/passport'
//import { deviceHistoryLogger } from 'src/utils/logger'
//import { ClientInfo } from 'src/utils/client-info'
import * as crypto from 'crypto'
@Controller('device-history')
export class DeviceHistoryController {
  constructor(private readonly deviceHistoryService: DeviceHistoryService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createDeviceHistory(
    @Request() req,
    @Body() body: { city: string; country: string },
  ) {
    const userId = req.user.id

    const { device, webBrowser } = this.deviceHistoryService.getDeviceInfo(req)

    const address =
      `${body.city || 'Desconocido'}, ${body.country || 'Desconocido'}`.trim()

    const rawDeviceId = `${userId}-${device}-${webBrowser}`
    const hash = crypto.createHash('sha256').update(rawDeviceId).digest('hex')

    const createDto: CreateDeviceHistoryDto = {
      device,
      deviceId: hash,
      webBrowser,
      address,
    }

    const result = await this.deviceHistoryService.createDeviceHistory(
      userId,
      createDto,
    )

    return result
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getDeviceHistorysByUserId(@Request() req) {
    const userId = req.user.id

    /*deviceHistoryLogger.info(`Requesting device history`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_DEVICE_HISTORY',
      },
      request: {
        userId: userId,
      },
    })*/

    const result =
      await this.deviceHistoryService.getDeviceHistoryByUserId(userId)

    /*deviceHistoryLogger.info(`Device history retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_DEVICE_HISTORY_SUCCESS',
      },
      response: {
        userId: userId,
        count: result.encryptedResponse.length || 0,
      },
    })*/

    return result
  }

  @Post('update/:id')
  async updatedeviceHistory(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    /*deviceHistoryLogger.info(`Starting device history update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_DEVICE_HISTORY',
      },
      request: {
        deviceHistoryId: id,
        status,
      },
    })*/

    const result = await this.deviceHistoryService.updateDeviceHistory(id, body)

    /*deviceHistoryLogger.info(`Device history updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_DEVICE_HISTORY_SUCCESS',
      },
      response: {
        historyId: result.encryptedResponse?.deviceHistory?.id,
        userId: result.encryptedResponse?.deviceHistory?.userId,
      },
    })*/

    return result
  }
}
