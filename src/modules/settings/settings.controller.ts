import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  NotFoundException,
  UseGuards,
} from '@nestjs/common'
import { SettingsService } from './settings.service'
import { CreateSettingsDto } from './dto/create.settings.dto'
import { UpdateSettingsDto } from './dto/update.settings.dto'
import { AuthGuard } from '@nestjs/passport'
import { settingsLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createSetting(
    @Body() createSettingDto: CreateSettingsDto,
    @Request() req,
  ) {
    if (!req.user) {
      throw new Error('User not found in request')
    }
    const userId = req.user.id

    settingsLogger.info(`Starting settings creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_SETTINGS',
      },
      request: {
        userId,
        ...createSettingDto,
      },
    })

    const result = await this.settingsService.createSetting(
      userId,
      createSettingDto,
    )

    settingsLogger.info(`Settings created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_SETTINGS_SUCCESS',
      },
      response: {
        settingsId: result.encryptedResponse.setting.id,
        userId: result.encryptedResponse.setting.userId,
      },
    })

    return result
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getSettingByUserId(@Request() req) {
    const userId = req.user.id

    settingsLogger.info(`Requesting user settings`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_SETTINGS',
      },
      request: {
        userId,
      },
    })

    const result = await this.settingsService.getSettingByUserId(userId)

    settingsLogger.info(`Settings retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_SETTINGS_SUCCESS',
      },
      response: {
        settingsId: result.encryptedResponse.id,
        userId: result.encryptedResponse.userId,
      },
    })

    return result
  }

  @Post('update/')
  @UseGuards(AuthGuard('jwt'))
  async updateSetting(
    @Request() req,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    const userId = req.user.id

    settingsLogger.info(`Starting settings update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_SETTINGS',
      },
      request: {
        userId,
        ...updateSettingsDto,
      },
    })

    const result = await this.settingsService.updateSetting(
      userId,
      updateSettingsDto,
    )

    settingsLogger.info(`Settings updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_SETTINGS_SUCCESS',
      },
      response: {
        settingsId: result.encryptedResponse.setting.id,
        userId: result.encryptedResponse.setting.userId,
      },
    })

    return result
  }
}
