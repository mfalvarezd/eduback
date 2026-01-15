import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common'
import { CompanyService } from './company.service'
import { RegisterCompanyDto } from './dto/register.company.dto'
import { AuthGuard } from '@nestjs/passport'
import { UpdateCompanyDto } from './dto/update.company.dto'
import { NotFoundError } from 'rxjs'
import { ClientInfo } from 'src/utils/client-info'
import { companyLogger } from 'src/utils/logger'
import { UsersService } from '../users/users.service'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { CreateCompanyUserDto } from './dto/addMember.company.dto'
import { MailService } from 'src/modules/mail/mail.service' // <-- Agregar esta importación

@Controller('companies')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly usersService: UsersService,
    private readonly encryptionService: EncryptionService,
    private readonly mailService: MailService, // <-- Inyectar MailService
  ) {}

  @Post('create')
  async registerCompany(
    @Body() registerCompanyDto: RegisterCompanyDto,
    @Request() req,
  ) {
    companyLogger.info(`Starting company registration`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_COMPANY',
      },
      request: {
        ...registerCompanyDto,
      },
    })

    let result = await this.companyService.createCompany(registerCompanyDto)
    // Si estamos en producción, desencripta para acceder a los valores pero devuelve solo el string encriptado
    const decryptedResult =
      process.env.NODE_ENV === 'production'
        ? this.encryptionService.decrypt(result.encryptedResponse)
        : result.encryptedResponse

    companyLogger.info(`Company created successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_COMPANY_SUCCESS',
      },
      response: {
        companyId: decryptedResult?.company?.id || 'No ID',
        userId: decryptedResult?.company?.userId || 'No User ID',
      },
    })

    return {
      encryptedResponse: result.encryptedResponse,
    }
  }

  @Get('all')
  async getAllCompanies(@Request() req) {
    companyLogger.info(`Requesting all companies`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_COMPANIES',
      },
    })

    const result = await this.companyService.getAllCompanies()

    companyLogger.info(`Companies retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_COMPANIES_SUCCESS',
      },
      response: {
        count: result.encryptedResponse.length,
      },
    })

    return result
  }

  @Get('my-company')
  @UseGuards(AuthGuard('jwt'))
  async getMyCompany(@Request() req) {
    const userId = req.user.id
    companyLogger.info(`Requesting company for user ID: ${userId}`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_MY_COMPANY',
      },
    })

    const result = await this.companyService.getCompanyByUserId(userId)

    const decryptedCompany = this.encryptionService.decrypt(
      result.encryptedResponse,
    )

    companyLogger.info(
      `Company retrieved successfully for user ID: ${userId}`,
      {
        metadata: {
          ...ClientInfo.getClientInfo(req),
          action: 'GET_MY_COMPANY_SUCCESS',
        },
        response: {
          companyId: decryptedCompany?.id,
        },
      },
    )

    return { encryptedData: result.encryptedResponse }
  }

  @Get(':id')
  async getCompanyById(@Param('id') id: string, @Request() req) {
    companyLogger.info(`Requesting company by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_COMPANY',
      },
      request: {
        companyId: id,
      },
    })

    const result = await this.companyService.getCompanyById(id)

    companyLogger.info(`Company retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_COMPANY_SUCCESS',
      },
      response: {
        companyId: result.encryptedResponse.id,
        userId: result.encryptedResponse.userId,
      },
    })

    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateCompany(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    if (!req.user) {
      throw new Error('User not found')
    }
    const userId = req.user.id
    companyLogger.info(`Starting company update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_COMPANY',
      },
      request: {
        companyId: id,
        userId: userId,
        ...updateCompanyDto,
      },
    })

    const result = await this.companyService.updateCompany(
      userId,
      id,
      updateCompanyDto,
    )

    companyLogger.info(`Company updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_COMPANY_SUCCESS',
      },
      response: {
        companyId: result.encryptedResponse?.company?.id,
        userId: result.encryptedResponse?.company?.userId,
      },
    })

    return result
  }

  @Get(':id/users')
  @UseGuards(AuthGuard('jwt'))
  async getUsersByCompanyId(@Param('id') companyId: string) {
    return this.companyService.getUsersByCompanyId(companyId)
  }

  @Get(':id/departments/users')
  @UseGuards(AuthGuard('jwt'))
  async getUsersByCompanyIdSegmented(
    @Param('id') companyId: string,
    @Request() req,
  ) {
    companyLogger.info(
      `Requesting users by company ID segmented by departments`,
      {
        metadata: {
          ...ClientInfo.getClientInfo(req),
          action: 'GET_USERS_BY_COMPANY_SEGMENTED',
        },
        request: {
          companyId: companyId,
        },
      },
    )

    const result =
      await this.companyService.getUsersByCompanyIdSegmented(companyId)

    companyLogger.info(`Users retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_USERS_BY_COMPANY_SEGMENTED_SUCCESS',
      },
      response: {
        companyId: companyId,
        departments: result,
      },
    })

    return result
  }

  @Post(':companyId/add-user')
  @UseGuards(AuthGuard('jwt'))
  async addUserToCompany(
    @Param('companyId') companyId: string,
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string,
    @Body('email') email: string,
    @Body('departmentId') departmentId: string,
    @Body('job') job: string,
    @Request() req,
  ) {
    const tokenUserId = req.user.id

    return this.companyService.addUserToCompany(
      tokenUserId,
      companyId,
      firstName,
      lastName,
      email,
      departmentId,
      job,
    )
  }

  @Post('create-user')
  @UseGuards(AuthGuard('jwt'))
  async createCompanyUser(
    @Request() req,
    @Body() createCompanyUserDto: CreateCompanyUserDto,
  ) {
    const companyOwnerId = req.user.id
    return this.companyService.createCompanyUser(
      companyOwnerId,
      createCompanyUserDto,
    )
  }

  @Post('send-invitation-email')
  @UseGuards(AuthGuard('jwt'))
  async sendInvitation(
    @Body() body: { email: string; invitationLink: string },
    @Request() req,
  ) {
    return this.companyService.sendInvitationEmail(
      body.email,
      body.invitationLink,
    )
  }
}
