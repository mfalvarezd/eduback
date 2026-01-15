import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AddUserToDepartmentDto } from './dto/adduser-to-department.dto'
import { RegisterCompanyDepartmentDto } from './dto/register.company-department.dto'
import { UpdateCompanyDepartmentDto } from './dto/update.company-department.dto'

@Injectable()
export class CompanyDepartmentService {
  private prisma = new PrismaClient()

  async registerDepartment(
    companyId: string,
    registerCompanyDepartmentDto: RegisterCompanyDepartmentDto,
  ) {
    const { name, icon } = registerCompanyDepartmentDto

    const companyExist = await this.prisma.company.findFirst({
      where: { id: companyId },
    })

    if (!companyExist) {
      throw new NotFoundException(`Company with id ${companyId} not found`)
    }

    const departmentExist = await this.prisma.companyDepartment.findFirst({
      where: {
        companyId,
        name,
      },
    })

    if (departmentExist) {
      throw new ConflictException(
        `'${name}' is already a department of company ID: '${companyId}'`,
      )
    }

    const department = await this.prisma.companyDepartment.create({
      data: {
        companyId,
        name,
        icon,
      },
    })

    return { message: 'Department registered successfully', department }
  }

  async getUsersByDepartmentId(departmentId: string) {
    if (!departmentId) {
      throw new BadRequestException('Department ID is required')
    }

    const department = await this.prisma.companyDepartment.findUnique({
      where: { id: departmentId },
      include: {
        UserDepartment: {
          include: {
            User: {
              omit: {
                idStripeCustomer: true,
                hash: true,
                salt: true,
              },
            },
          },
        },
      },
    })

    if (!department) {
      throw new NotFoundException(
        `Department with id ${departmentId} not found`,
      )
    }

    return department.UserDepartment.map(
      (userDepartment) => userDepartment.User,
    )
  }

  async addUserToDepartment(data: AddUserToDepartmentDto) {
    const { departmentId, userId } = data

    const departmentExists = await this.prisma.companyDepartment.findUnique({
      where: { id: departmentId },
    })

    if (!departmentExists) {
      throw new NotFoundException(
        `Department with ID: '${departmentId}' not found`,
      )
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!userExists) {
      throw new NotFoundException(`User with ID: '${userId}' not found`)
    }

    const existingUserDepartment = await this.prisma.userDepartment.findFirst({
      where: {
        departmentId,
        userId,
      },
    })

    if (existingUserDepartment) {
      throw new ConflictException(
        `User with ID: '${userId}' is already a member of department ID: '${departmentId}'`,
      )
    }

    const userDepartment = await this.prisma.userDepartment.create({
      data: {
        departmentId,
        userId,
      },
    })

    return { message: 'User added to department successfully', userDepartment }
  }

  async getDepartmentsByCompanyId(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required')
    }

    const departments = await this.prisma.companyDepartment.findMany({
      where: { companyId },
    })

    if (!departments || departments.length === 0) {
      throw new NotFoundException(
        `No departments found for company ID: ${companyId}`,
      )
    }

    return departments
  }

  async updateDepartment(
    departmentId: string,
    companyId: string,
    updateCompanyDepartmentDto: UpdateCompanyDepartmentDto,
  ) {
    const department = await this.prisma.companyDepartment.findFirst({
      where: {
        id: departmentId,
        companyId: companyId,
      },
    })

    if (!department) {
      throw new NotFoundException(
        'Departamento no encontrado o no pertenece a esta compañía',
      )
    }

    const updatedDepartment = await this.prisma.companyDepartment.update({
      where: { id: departmentId },
      data: {
        name: updateCompanyDepartmentDto.name || department.name,
        icon: updateCompanyDepartmentDto.icon || department.icon,
      },
    })

    return {
      success: true,
      message: 'Departamento actualizado correctamente',
      department: updatedDepartment,
    }
  }

  async getCompanyByDepartmentId(departmentId: string) {
    if (!departmentId) {
      throw new BadRequestException('Department ID is required')
    }

    const department = await this.prisma.companyDepartment.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        companyId: true,
      },
    })

    if (!department) {
      throw new NotFoundException(
        `Department with ID: '${departmentId}' not found`,
      )
    }

    return {
      success: true,
      message: 'Company ID retrieved successfully',
      departmentId: department.id,
      departmentName: department.name,
      companyId: department.companyId,
    }
  }
}
