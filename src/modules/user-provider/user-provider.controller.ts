import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { UserProviderService } from './user-provider.service'
import { CreateUserProviderDto } from './dto/create-user-provider.dto'
import { AuthGuard } from '@nestjs/passport'
import { userProviderLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Controller('user-provider')
export class UserProviderController {
  constructor(private readonly userProviderService: UserProviderService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createUserProvider(
    @Body() createUserProviderDto: CreateUserProviderDto,
    @Request() req,
  ) {
    const userId = req.user.id
    userProviderLogger.info(`Starting user provider creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_PROVIDER',
      },
      request: {
        userId,
        ...createUserProviderDto,
      },
    })

    const result = await this.userProviderService.createUserProvider(
      userId,
      createUserProviderDto,
    )

    userProviderLogger.info(`User provider created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_PROVIDER_SUCCESS',
      },
      response: {
        userProviderId: result.encryptedResponse.userProvider.id,
        userId: result.encryptedResponse.userProvider.userId,
      },
    })

    return result
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getUserProvidersByUserId(
    @Param('userId') userId: string,
    @Request() req,
  ) {
    userProviderLogger.info(`Requesting user providers`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_PROVIDERS',
      },
      request: {
        userId: userId,
      },
    })

    const result =
      await this.userProviderService.getUserProvidersByUserId(userId)

    userProviderLogger.info(`User providers retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_PROVIDERS_SUCCESS',
      },
      response: {
        userId: userId,
        count: result.encryptedResponse.length || 0,
      },
    })

    return result
  }
}
