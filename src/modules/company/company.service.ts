import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { RegisterCompanyDto } from './dto/register.company.dto'
import { UpdateCompanyDto } from './dto/update.company.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { CreateCompanyUserDto } from './dto/addMember.company.dto'
import { SettingsService } from '../settings/settings.service'
import { StorageService } from 'src/storage/storage.service'
import { MailService } from 'src/modules/mail/mail.service'

@Injectable()
export class CompanyService {
  private prisma = new PrismaClient()

  constructor(
    private encryptionService: EncryptionService,
    private settingsService: SettingsService,
    private storageService: StorageService,
    private mailService: MailService,
  ) {}

  async createCompany(registerCompanyDto: RegisterCompanyDto) {
    const {
      userId,
      name,
      companyName,
      matrixDirection,
      taxId,
      size,
      country,
      city,
    } = registerCompanyDto

    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!registerCompanyDto.name) {
        throw new BadRequestException('Company name is required')
      }

      const existingCompany = await this.prisma.company.findFirst({
        where: { userId },
      })
      if (existingCompany) {
        throw new ConflictException('This company already exists')
      }

      const company = await this.prisma.company.create({
        data: {
          userId,
          name,
          companyName,
          matrixDirection,
          taxId,
          size,
          country,
          city,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Company created successfully',
        company,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating company')
    }
  }

  async getAllCompanies() {
    try {
      const companies = await this.prisma.company.findMany({
        include: {
          companyProducts: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt(companies)
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException('Error getting companies')
    }
  }

  async getCompanyById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Company ID is required')
      }
      const company = await this.prisma.company.findUnique({
        where: { id },
        include: {
          companyProducts: true,
        },
      })

      if (!company) {
        throw new NotFoundException(`Company with id ${id} not found`)
      }

      const encryptedResponse = this.encryptionService.encrypt(company)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error getting company')
    }
  }

  async updateCompany(
    userId: string,
    companyId: string,
    updateData: UpdateCompanyDto,
  ) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!companyId) {
        throw new BadRequestException('Company ID is required')
      }
      if (updateData.name === null)
        throw new BadRequestException("Name can't be send as null")

      if (updateData.size === null)
        throw new BadRequestException("Size can't be send as null")

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      })

      if (!company) {
        throw new NotFoundException('Company not found')
      }

      if (company.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to update this company',
        )
      }

      const updatedCompany = await this.prisma.company.update({
        where: { id: companyId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Company updated successfully',
        company: updatedCompany,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating company')
    }
  }

  async getUsersByCompanyId(companyId: string) {
    try {
      if (!companyId) {
        throw new BadRequestException('Company ID is required')
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: {
          companyDepartment: {
            include: {
              UserDepartment: {
                include: {
                  User: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      email: true,
                      job: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!company) {
        throw new NotFoundException(`Company with id ${companyId} not found`)
      }

      const departments = company.companyDepartment
        .map((department) => ({
          departmentName: department.name,
          users: department.UserDepartment.map((userDepartment) => ({
            userId: userDepartment.User.id,
            name: `${userDepartment.User.firstName} ${userDepartment.User.lastName}`,
            email: userDepartment.User.email,
            job: userDepartment.User.job,
          })),
        }))
        .sort((a, b) => b.users.length - a.users.length) // Ordenar por número de usuarios

      const encryptedResponse = this.encryptionService.encrypt(departments)

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error getting users by company')
    }
  }

  async getUsersByCompanyIdSegmented(companyId: string) {
    if (!companyId) {
      throw new BadRequestException('Company ID is required')
    }

    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        companyDepartment: {
          include: {
            UserDepartment: {
              include: {
                User: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    job: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!company) {
      throw new NotFoundException(`Company with id ${companyId} not found`)
    }

    const departments = company.companyDepartment.map((department) => ({
      departmentId: department.id,
      departmentName: department.name,
      users: department.UserDepartment.map((userDepartment) => ({
        userId: userDepartment.User.id,
        name: `${userDepartment.User.firstName} ${userDepartment.User.lastName}`,
        email: userDepartment.User.email,
        job: userDepartment.User.job,
      })),
    }))

    return departments
  }

  async addUserToCompany(
    userId: string,
    companyId: string,
    firstName: string,
    lastName: string,
    email: string,
    departmentId: string,
    job?: string,
  ) {
    try {
      if (!companyId) {
        throw new BadRequestException('Company ID is required')
      }
      if (!firstName) {
        throw new BadRequestException('First name is required')
      }
      if (!lastName) {
        throw new BadRequestException('Last name is required')
      }
      if (!email) {
        throw new BadRequestException('Email is required')
      }
      if (!departmentId) {
        throw new BadRequestException('DepartmentId is required')
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      })

      if (!company) {
        throw new NotFoundException(`Company with id ${companyId} not found`)
      }

      if (company.userId !== userId) {
        throw new ForbiddenException(
          'You do not have permission to add users to this company',
        )
      }

      const department = await this.prisma.companyDepartment.findUnique({
        where: { id: departmentId },
      })

      if (!department) {
        throw new NotFoundException(
          `Department with id ${departmentId} not found`,
        )
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      })

      if (!existingUser) {
        throw new NotFoundException('User with this email does not exist')
      }

      const exist = await this.prisma.userDepartment.findFirst({
        where: { userId: existingUser.id, departmentId },
      })

      if (exist) {
        throw new ConflictException(
          `User with ID: '${existingUser.id}' is already a member of department ID: '${departmentId}'`,
        )
      }

      // const user = await this.prisma.user.update({
      //   where: { email },
      //   data: {
      //     firstName,
      //     lastName,
      //     job: job || null,
      //     //Company: { connect: { id: company.id } },
      //   },
      // })

      const userDepartment = await this.prisma.userDepartment.create({
        data: {
          userId: existingUser.id,
          departmentId,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'User added to company successfully',
        userDepartment,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error adding user to company')
    }
  }

  async getCompanyByUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required')
    }

    const company = await this.prisma.company.findFirst({
      where: { userId },
    })

    if (!company) {
      throw new NotFoundException(`No company found for user ID: ${userId}`)
    }

    const encryptedResponse = this.encryptionService.encrypt(company)

    return { encryptedResponse }
  }

  async createCompanyUser(
    companyOwnerId: string,
    createCompanyUserDto: CreateCompanyUserDto,
  ) {
    try {
      // ... validaciones previas y obtención de companyId, company, etc.
      const companyRecord = await this.prisma.company.findFirst({
        where: { userId: companyOwnerId },
      })
      const companyId = companyRecord?.id
      if (!companyId) {
        throw new BadRequestException('Company ID is required')
      }

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      })
      if (!company) {
        throw new NotFoundException(`Company with id ${companyId} not found`)
      }
      if (company.userId !== companyOwnerId) {
        throw new ForbiddenException(
          'You do not have permission to add users to this company',
        )
      }
      // Verificar que no exista un usuario con ese correo
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createCompanyUserDto.email },
      })
      if (existingUser) {
        throw new ConflictException('User with this email already exists')
      }
      // Crear el usuario
      const user = await this.prisma.user.create({
        data: {
          firstName: createCompanyUserDto.firstName,
          lastName: createCompanyUserDto.lastName,
          email: createCompanyUserDto.email,
          job: createCompanyUserDto.job,
          department: createCompanyUserDto.department, // se guarda el string en el usuario
          role: 'Usuario',
          //fromCompany: companyId,
          userName: createCompanyUserDto.email,
          isVerified: false,
          signedIn: false,
          hash: null,
          salt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      // Crear settings, bucket, etc. (se omiten para abreviar)
      await this.settingsService.createSetting(user.id, {
        language: 'Español',
        dayFormat: '00/08/31',
        timeFormat: '1:01 AM - 11:59 PM',
        timeZone: 'America/Guayaquil',
        changeTimeZone: false,
        pushNotifications: true,
        activitiesNotifications: false,
        summaryNotifications: false,
        news: false,
        bin: 15,
        proyectModification: true,
        addMembers: false,
        export: false,
      })

      await this.storageService.postBucket(user.id)

      // Lógica para crear el departamento y registrar en UserDepartment
      if (createCompanyUserDto.department) {
        // Buscar el departamento en la compañía por su nombre
        let department = await this.prisma.companyDepartment.findFirst({
          where: { name: createCompanyUserDto.department, companyId },
        })

        // Si no existe, lo creamos
        if (!department) {
          department = await this.prisma.companyDepartment.create({
            data: {
              name: createCompanyUserDto.department,
              companyId,
              icon: createCompanyUserDto.icon || 'default-icon',
            },
          })
        }

        // Registrar la relación en UserDepartment
        await this.prisma.userDepartment.create({
          data: {
            userId: user.id,
            departmentId: department.id,
          },
        })
      }

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'User created successfully',
        user,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 403) {
        throw new ForbiddenException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating company user')
    }
  }

  async sendInvitationEmail(email: string, invitationLink: string) {
    try {
      const html = `
  <!DOCTYPE html>
  <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitación para Unirte</title>
      <style>
        body {
          background-color: #f4f7fc;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
          background-color: #051e46;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          color: #ffffff;
          font-size: 24px;
        }
        .content {
          padding: 30px;
          text-align: center;
        }
        .content p {
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .button {
          display: inline-block;
          padding: 15px 25px;
          background-color: #051e46;
          color: #ffffff !important;
          text-decoration: none;
          font-size: 16px;
          border-radius: 5px;
        }
        .footer {
          background-color: #f4f4f4;
          padding: 15px;
          text-align: center;
          font-size: 14px;
          color: #051e46;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invitación para unirte a una compañía</h1>
        </div>
        <div class="content">
          <p>Hola,</p>
          <p>Has sido invitado a unirte a un equipo. Por favor, haz clic en el siguiente botón para completar tu registro en la compañía:</p>
          <a href="${invitationLink}" class="button" style="color: #ffffff; text-decoration: none;">Unirse Ahora</a>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Solinal. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
  </html>
      `
      await this.mailService.sendInvoiceEmail(
        email,
        'Invitación para unirse',
        html,
      )
      return { message: 'Invitación enviada' }
    } catch (error) {
      throw new InternalServerErrorException('Error al enviar la invitación')
    }
  }

  // async getCompanyUsers(companyOwnerId: string) {
  //   // Buscar la compañía a partir del ownerId del dueño
  //   const companyRecord = await this.prisma.company.findFirst({
  //     where: { userId: companyOwnerId },
  //   })

  //   if (!companyRecord) {
  //     throw new NotFoundException(
  //       `No company found for owner id: ${companyOwnerId}`,
  //     )
  //   }

  //   const companyId = companyRecord.id

  //   // Obtener los usuarios que tengan companyId coincidente
  //   const companyUsers = await this.prisma.user.findMany({
  //     where: { fromCompany: companyId },
  //   })

  //   const encryptedResponse = this.encryptionService.encrypt({
  //     message: 'Company users retrieved successfully',
  //     users: companyUsers,
  //   })

  //   return { encryptedResponse }
  // }
}
