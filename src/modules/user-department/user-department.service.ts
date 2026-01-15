import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { AddUserToDepartmentDto } from './dto/add.user-department.dto'
import { UpdateMemberInfoDto } from './dto/updateMemberInfo.dto'
import { StorageService } from 'src/storage/storage.service'

@Injectable()
export class UserDepartmentService {
  constructor(private readonly storageService: StorageService) {}
  private prisma = new PrismaClient()

  async getUsersByDepartmentId(departmentId: string) {
    if (!departmentId) {
      throw new BadRequestException('Department ID is required')
    }

    const department = await this.prisma.companyDepartment.findUnique({
      where: { id: departmentId },
      include: {
        UserDepartment: {
          include: {
            User: true,
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

    if (!departmentId) {
      throw new BadRequestException('Department ID is required')
    }

    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

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

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        department: departmentExists.name,
      },
    })

    return { message: 'User added to department successfully', userDepartment }
  }

  async removeUserFromDepartment(departmentId: string, userId: string) {
    if (!departmentId) {
      throw new BadRequestException('Department ID is required')
    }

    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

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

    const userDepartment = await this.prisma.userDepartment.findFirst({
      where: {
        departmentId,
        userId,
      },
    })

    if (!userDepartment) {
      throw new NotFoundException(
        `User with ID: '${userId}' is not a member of department ID: '${departmentId}'`,
      )
    }

    // Eliminar la relación usuario-departamento de forma segura
    await this.prisma.userDepartment.deleteMany({
      where: { id: userDepartment.id },
    })

    // Actualizar el usuario para limpiar el campo department
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        department: null,
      },
    })

    // Eliminar los settings asociados del usuario (si existen)
    await this.prisma.setting.delete({
      where: { userId },
    })

    // // Eliminar los providers asociados del usuario (si existen)
    // await this.prisma.userProvider.deleteMany({
    //   where: { userId },
    // })

    await this.prisma.notification.deleteMany({
      where: {
        OR: [{ transmitterId: userId }, { recieverId: userId }],
      },
    })

    // Eliminar el bucket asociado al usuario
    await this.storageService.deleteBucket(userId)

    // Eliminar el usuario
    await this.prisma.user.delete({
      where: { id: userId },
    })

    return { message: 'User and all related records removed successfully' }
  }

  async updateMemberInfo(
    userId: string,
    updateMemberInfoDto: UpdateMemberInfoDto,
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!userExists) {
      throw new NotFoundException(`User with ID: '${userId}' not found`)
    }

    if (updateMemberInfoDto.department) {
      const currentUserDepartment = await this.prisma.userDepartment.findFirst({
        where: { userId },
        include: {
          CompanyDepartment: {
            include: {
              company: true,
            },
          },
        },
      })

      if (
        !currentUserDepartment ||
        !currentUserDepartment.CompanyDepartment?.company
      ) {
        throw new NotFoundException(
          `Company associated with user ID: '${userId}' not found. User must be assigned to a department first.`,
        )
      }

      const companyId = currentUserDepartment.CompanyDepartment.company.id

      let department = await this.prisma.companyDepartment.findFirst({
        where: {
          name: updateMemberInfoDto.department,
          companyId: companyId,
        },
      })

      if (!department) {
        department = await this.prisma.companyDepartment.create({
          data: {
            name: updateMemberInfoDto.department,
            companyId: companyId,
            icon: 'default-department-icon',
          },
        })
      }

      if (currentUserDepartment.departmentId !== department.id) {
        await this.prisma.userDepartment.delete({
          where: { id: currentUserDepartment.id },
        })

        await this.prisma.userDepartment.create({
          data: {
            userId,
            departmentId: department.id,
          },
        })
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateMemberInfoDto.firstName,
        lastName: updateMemberInfoDto.lastName,
        cellphone: updateMemberInfoDto.cellphone,
        email: updateMemberInfoDto.email,
        country: updateMemberInfoDto.country,
        city: updateMemberInfoDto.city,
        department: updateMemberInfoDto.department,
        job: updateMemberInfoDto.job,
        birthday: updateMemberInfoDto.birthday,
      },
    })

    if (updateMemberInfoDto.companyName) {
      let companyId = updateMemberInfoDto.companyId

      if (!companyId) {
        const userDepartment = await this.prisma.userDepartment.findFirst({
          where: { userId },
          include: {
            CompanyDepartment: {
              include: {
                company: true,
              },
            },
          },
        })

        if (!userDepartment || !userDepartment.CompanyDepartment?.company) {
          throw new NotFoundException(
            `Company associated with user ID: '${userId}' not found`,
          )
        }

        companyId = userDepartment.CompanyDepartment.company.id
      }

      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          name: updateMemberInfoDto.companyName,
        },
      })
    }

    return { message: 'User information updated successfully', updatedUser }
  }

  async getCompanyByUser(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

    // Buscar la relación del usuario con algún departamento
    const userDepartment = await this.prisma.userDepartment.findFirst({
      where: { userId },
      include: { CompanyDepartment: true },
    })

    if (!userDepartment || !userDepartment.CompanyDepartment) {
      throw new NotFoundException(
        `No se encontró la relación de departamento para el usuario con ID: '${userId}'.`,
      )
    }

    // Recuperar el id de la compañía desde la relación del departamento
    const companyId = userDepartment.CompanyDepartment.companyId

    // Obtener la compañía completa a partir de su id
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    })

    if (!company) {
      throw new NotFoundException(
        `No se encontró la compañía con ID: '${companyId}'.`,
      )
    }

    return company
  }

  async getAllColleaguesFromCompany(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

    // Encontrar la relación del usuario para obtener su CompanyDepartment
    const userDepartment = await this.prisma.userDepartment.findFirst({
      where: { userId },
      include: { CompanyDepartment: true },
    })

    if (!userDepartment || !userDepartment.CompanyDepartment) {
      throw new NotFoundException(
        `No se encontró la relación de departamento para el usuario con ID: '${userId}'.`,
      )
    }

    // Obtén el companyId de la compañía a la que pertenece
    const companyId = userDepartment.CompanyDepartment.companyId

    const colleaguesRecords = await this.prisma.userDepartment.findMany({
      where: {
        CompanyDepartment: { companyId },
      },
      include: { User: true },
    })

    return colleaguesRecords.map((record) => record.User)
  }
}
