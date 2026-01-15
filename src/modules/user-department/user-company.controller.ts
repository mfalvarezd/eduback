import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common'
import { UserDepartmentService } from './user-department.service'
import { AuthGuard } from '@nestjs/passport'

@Controller('user-company')
export class UserCompanyController {
  constructor(private readonly userDepartmentService: UserDepartmentService) {}

  @Get('company-info/:userId')
  @UseGuards(AuthGuard('jwt'))
  async getCompanyByUser(@Param('userId') userId: string) {
    return this.userDepartmentService.getCompanyByUser(userId)
  }
  @Get('company-colleagues')
  @UseGuards(AuthGuard('jwt'))
  async getAllColleagues(@Req() req) {
    const userId = req.user?.id
    if (!userId) {
      throw new Error('Usuario no autenticado')
    }
    return this.userDepartmentService.getAllColleaguesFromCompany(userId)
  }
}
