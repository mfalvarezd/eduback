import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { UserDeviceService } from './user-device.service'
import { CreateUserDeviceDto } from './dto/create.user-device.dto'
import { UpdateUserDeviceDto } from './dto/update.user-device.dto'
import { AuthGuard } from '@nestjs/passport'
//import { userDeviceLogger } from 'src/utils/logger'
//import { ClientInfo } from 'src/utils/client-info'

@Controller('user-device')
export class UserDeviceController {
  constructor(private readonly userDeviceService: UserDeviceService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createUserDevice(
    @Body() createUserDeviceDto: CreateUserDeviceDto,
    @Request() req,
  ) {
    const userId = req.user.id
    /*userDeviceLogger.info(`Starting user device creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_DEVICE',
      },
      request: {
        userId,
        ...createUserDeviceDto,
      },
    })*/

    const result = await this.userDeviceService.createUserDevice(
      userId,
      createUserDeviceDto,
    )

    /*userDeviceLogger.info(`User device created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_DEVICE_SUCCESS',
      },
      response: {
        userDeviceId: result.encryptedResponse.userDevice.id,
        userId: result.encryptedResponse.userDevice.userId,
      },
    })*/

    return result
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserDevicesByUserId(
    @Request() req,
  ) {
    const userId = req.user.id
    /*userDeviceLogger.info(`Requesting user device`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_DEVICE',
      },
      request: {
        userId: userId,
      },
    })*/

    const result = await this.userDeviceService.getUserDeviceByUserId(userId)

    /*userDeviceLogger.info(`User device retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_DEVICE_SUCCESS',
      },
      response: {
        userId: userId,
        count: result.encryptedResponse.length || 0,
      },
    })*/

    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updatedevice(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateUserDeviceDto,
  ) {
    if (!req.user) {
      throw new Error('User not found')
    }
    const userId = req.user.id
    /*userDeviceLogger.info(`Starting user device update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_USER_DEVICE',
      },
      request: {
        deviceId: id,
        userId: userId,
        ...updateDeviceDto,
      },
    })*/

    const result = await this.userDeviceService.updateDevice(
      userId,
      id,
      updateDeviceDto,
    )

    /*userDeviceLogger.info(`Device updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_USER_DEVICE_SUCCESS',
      },
      response: {
        deviceId: result.encryptedResponse?.device?.id,
        userId: result.encryptedResponse?.device?.userId,
      },
    })*/

    return result
  }
}
