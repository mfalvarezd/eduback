import { Controller, Get, Param, Post, Body, Request } from '@nestjs/common'
import { UserDepartmentService } from './user-department.service'
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { AddUserToDepartmentDto } from './dto/add.user-department.dto'
import { UpdateMemberInfoDto } from './dto/updateMemberInfo.dto'
@Controller('departments/:departmentId/users')
export class UserDepartmentController {
  constructor(private readonly userDepartmentService: UserDepartmentService) {}

  @Get('user/:userId/company')
  @UseGuards(AuthGuard('jwt'))
  async getCompanyByUser(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.userDepartmentService.getCompanyByUser(userId)
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getUsersByDepartmentId(@Param('departmentId') departmentId: string) {
    return this.userDepartmentService.getUsersByDepartmentId(departmentId)
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async addUserToDepartment(
    @Param('departmentId') departmentId: string,
    @Body()
    addUserToDepartmentDto: Omit<AddUserToDepartmentDto, 'departmentId'>,
  ) {
    const completeDto: AddUserToDepartmentDto = {
      ...addUserToDepartmentDto,
      departmentId,
    }

    console.log('Complete DTO:', completeDto)

    return this.userDepartmentService.addUserToDepartment(completeDto)
  }

  @Post(':userId/remove')
  @UseGuards(AuthGuard('jwt'))
  async removeUserFromDepartment(
    @Param('departmentId') departmentId: string,
    @Param('userId') userId: string,
  ) {
    return this.userDepartmentService.removeUserFromDepartment(
      departmentId,
      userId,
    )
  }

  @Post(':userId')
  @UseGuards(AuthGuard('jwt'))
  async updateMemberInfo(
    @Param('userId') userId: string,
    @Body() updateMemberInfoDto: UpdateMemberInfoDto,
  ) {
    return this.userDepartmentService.updateMemberInfo(
      userId,
      updateMemberInfoDto,
    )
  }
}
