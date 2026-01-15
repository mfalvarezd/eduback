import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common'
import { CompanyDepartmentService } from './company-department.service'
import { AddUserToDepartmentDto } from './dto/adduser-to-department.dto'
import { RegisterCompanyDepartmentDto } from './dto/register.company-department.dto'
import { UpdateCompanyDepartmentDto } from './dto/update.company-department.dto'
import { AuthGuard } from '@nestjs/passport'

@Controller('companies/:companyId/departments')
export class CompanyDepartmentController {
  constructor(
    private readonly companyDepartmentService: CompanyDepartmentService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async registerDepartment(
    @Param('companyId') companyId: string,
    @Body() registerCompanyDepartmentDto: RegisterCompanyDepartmentDto,
    @Request() req,
  ) {
    return this.companyDepartmentService.registerDepartment(
      companyId,
      registerCompanyDepartmentDto,
    )
  }

  @Get(':departmentId/users')
  @UseGuards(AuthGuard('jwt'))
  async getUsersByDepartmentId(@Param('departmentId') departmentId: string) {
    return this.companyDepartmentService.getUsersByDepartmentId(departmentId)
  }

  @Post(':departmentId/users')
  @UseGuards(AuthGuard('jwt'))
  async addUserToDepartment(
    @Param('departmentId') departmentId: string,
    @Body() addUserToDepartmentDto: AddUserToDepartmentDto,
    @Request() req,
  ) {
    addUserToDepartmentDto.departmentId = departmentId
    return this.companyDepartmentService.addUserToDepartment(
      addUserToDepartmentDto,
    )
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async getDepartmentsByCompanyId(@Param('companyId') companyId: string) {
    return this.companyDepartmentService.getDepartmentsByCompanyId(companyId)
  }

  @Post(':departmentId/update')
  @UseGuards(AuthGuard('jwt'))
  async updateDepartment(
    @Param('companyId') companyId: string,
    @Param('departmentId') departmentId: string,
    @Body() updateCompanyDepartmentDto: UpdateCompanyDepartmentDto,
    @Request() req,
  ) {
    return this.companyDepartmentService.updateDepartment(
      departmentId,
      companyId,
      updateCompanyDepartmentDto,
    )
  }

  @Get(':departmentId/company')
  @UseGuards(AuthGuard('jwt'))
  async getCompanyByDepartmentId(
    @Param('departmentId') departmentId: string,
    @Param('companyId') companyId: string,
  ) {
    return this.companyDepartmentService.getCompanyByDepartmentId(departmentId)
  }
}
