import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common'
import { GroupUserService } from './group-user.service'
import { RegisterGroupUserDto } from './dto/register.group-user.dto'
import { groupLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'
import { AuthGuard } from '@nestjs/passport'

@Controller('group-users')
export class GroupUserController {
  constructor(private groupUserService: GroupUserService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async createGroupUser(
    @Body() registerGroupUserDto: RegisterGroupUserDto,
    @Request() req,
  ) {
    const userId = req.user.id
    groupLogger.info(`Starting group user registration`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'ADD_MEMBER',
      },
      request: {
        userId: userId,
        groupId: registerGroupUserDto.groupId,
      },
    })

    const result = await this.groupUserService.addMember(registerGroupUserDto)

    groupLogger.info(`User added to group successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'ADD_MEMBER_SUCCESS',
      },
      response: {
        userId: result.encryptedResponse.groupUser.userId,
        groupId: result.encryptedResponse.groupUser.groupId,
      },
    })

    return result
  }

  @Get('group/:groupId')
  async getGroupMembers(@Param('groupId') groupId: string, @Request() req) {
    groupLogger.info(`Requesting group members`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_GROUP_MEMBERS',
      },
      request: {
        groupId: groupId,
      },
    })

    const members = await this.groupUserService.getGroupMembers(groupId)

    groupLogger.info(`Group members retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_GROUP_MEMBERS_SUCCESS',
      },
      response: {
        groupId: groupId,
        memberCount: Array.isArray(members.encryptedResponse)
          ? members.encryptedResponse.length
          : 0,
      },
    })

    return members
  }

  @Post('group/:groupId/remove/:userId')
  @UseGuards(AuthGuard('jwt'))
  async removeGroupMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @Request() req,
  ) {
    groupLogger.info(`Starting member removal from group`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'REMOVE_MEMBER',
      },
      request: {
        groupId: groupId,
        userId: userId,
      },
    })

    const result = await this.groupUserService.removeGroupMember(
      groupId,
      userId,
    )

    groupLogger.info(`Member removed from group successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'REMOVE_MEMBER_SUCCESS',
      },
      response: {
        groupId: groupId,
        userId: userId,
      },
    })

    return result
  }
}
