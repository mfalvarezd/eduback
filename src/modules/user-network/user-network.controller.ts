import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common'
import { UserNetworkService } from './user-network.service'
import { CreateUserNetworkDto } from './dto/create.user-network.dto'
import { UpdateUserNetworkDto } from './dto/updates.user-network.dto'
import { AuthGuard } from '@nestjs/passport'
//import { userNetworkLogger } from 'src/utils/logger'
//import { ClientInfo } from 'src/utils/client-info'

@Controller('user-network')
export class UserNetworkController {
  constructor(private readonly userNetworkService: UserNetworkService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createUserNetwork(
    @Body() createUserNetworkDto: CreateUserNetworkDto,
    @Request() req,
  ) {
    const userId = req.user.id
    /*userNetworkLogger.info(`Starting user network creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_NETWORK',
      },
      request: {
        userId,
        ...createUserNetworkDto,
      },
    })*/

    const result = await this.userNetworkService.createUserNetwork(
      userId,
      createUserNetworkDto,
    )

    /*userNetworkLogger.info(`User network created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_USER_NETWORK_SUCCESS',
      },
      response: {
        userNetworkId: result.encryptedResponse.userNetwork.id,
        userId: result.encryptedResponse.userNetwork.userId,
      },
    })*/

    return result
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUserNetworksByUserId(
    @Request() req,
  ) {
    const userId = req.user.id
    /*userNetworkLogger.info(`Requesting user networks`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_NETWORKS',
      },
      request: {
        userId: userId,
      },
    })*/

    const result = await this.userNetworkService.getUserNetworkByUserId(userId)

    /*userNetworkLogger.info(`User networks retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USER_NETWORKS_SUCCESS',
      },
      response: {
        userId: userId,
        count: result.encryptedResponse.length || 0,
      },
    })*/

    return result
  }

  @Post('update/')
  @UseGuards(AuthGuard('jwt'))
  async updateNetwork(
    @Request() req,
    @Body() updateDto: UpdateUserNetworkDto,
  ) {
    const userId = req.user.id

    /*userNetworkLogger.info(`Starting user network update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_USER_NETWORK',
      },
      request: {
        userId,
        ...updateDto,
      },
    })*/

    const result = await this.userNetworkService.updateNetwork(
      userId,
      updateDto,
    )

    /*userNetworkLogger.info(`Network updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_USER_NETWORK_SUCCESS',
      },
      response: {
        networkId: result.encryptedResponse.network.id,
        userId: result.encryptedResponse.network.userId,
      },
    })*/

    return result
  }
}
