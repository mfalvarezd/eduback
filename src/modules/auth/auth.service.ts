import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  HttpStatus,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { UsersService } from '../users/users.service'
import { PrismaService } from '../../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'
import { EncryptionService } from '../../utils/encryption/encryption.service'
import e, { Response, Request } from 'express'
import { userLogger } from 'src/utils/logger'
import { RegisterDto } from './dto/register.user.dto'
import { ClientInfo } from 'src/utils/client-info'
import { ConfigService } from '@nestjs/config'
import { ChangePasswordDto } from './dto/change-password.dto'
import { MailService } from '../mail/mail.service'
import { StorageService } from 'src/storage/storage.service'
import { SettingsService } from '../settings/settings.service'
import { TwilioService } from '../twilio/twilio.service'
import * as jwt from 'jsonwebtoken'
import {
  setSecureCookie,
  clearSecureCookie,
  clearPublicCookie,
} from '../../utils/cookie-helper'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
    private readonly settingsService: SettingsService,
    private readonly twilioService: TwilioService,
  ) {}

  private generateHash(credential: string): { salt: string; hash: string } {
    const salt = crypto.randomBytes(32).toString('hex')
    const hash = crypto
      .pbkdf2Sync(credential, salt, 25000, 512, 'sha256')
      .toString('hex')
    return { salt, hash }
  }

  async register(data: RegisterDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      cellphone,
      country,
      city,
      userName,
      birthday,
      role,
      job,
      department,
      type,
      companyName,
      companySize,
      matrixDirection,
      taxId,
    } = data

    const existingUser = await this.usersService.findByEmail(email)
    if (existingUser) {
      throw new ConflictException('Email already linked to an account')
    }

    const existingUserName = userName
      ? await this.usersService.findByUsername(userName)
      : null

    if (existingUserName) {
      throw new ConflictException('Username already linked to an account')
    }

    const { salt, hash } = this.generateHash(password)
    const fechaActual = new Date()

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        hash,
        salt,
        cellphone: cellphone || null,
        country: country || null,
        city: city || null,
        userName: userName || email,
        birthday: birthday || null,
        role: role || 'Administrador',
        job: job || null,
        department: department || null,
        type: type || null,
        isVerified: false,
        signedIn: false,
        urlPhoto: null,
        idStripeCustomer: null,
        createdAt: fechaActual,
        updatedAt: fechaActual,
      },
    })

    let company: any = null
    if (companyName) {
      company = await this.prisma.company.findFirst({
        where: { name: companyName },
      })

      if (!company) {
        company = await this.prisma.company.create({
          data: {
            name: companyName,
            size: companySize || 'N/A',
            matrixDirection: matrixDirection || null,
            taxId: taxId || null,
            country: country || null,
            city: city || null,
            createdAt: fechaActual,
            updatedAt: fechaActual,
            User: {
              connect: { id: user.id },
            },
          },
        })
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { Company: { connect: { id: company.id } } },
      })
    }

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

    const response_encrypted = this.encryptionService.encrypt({
      message: 'User registered successfully',
      userId: user.id,
      email: user.email,
      companyId: company ? company.id : null,
      companyName: company ? company.name : null,
    })

    userLogger.info(`User registered successfully`, {
      metadata: {
        action: 'REGISTER_USER_SUCCESS',
      },
      response: {
        email: user.email,
        companyName: company ? company.name : null,
      },
    })

    return { response_encrypted }
  }

  async login({ email, password }: LoginDto, res: Response, req: Request) {
    try {
      userLogger.info(`Starting login process`, {
        metadata: {
          ...ClientInfo.getClientInfo(req),
          action: 'LOGIN_ATTEMPT',
        },
        request: {
          email,
        },
      })

      const user = await this.usersService.findByEmail(email)
      if (!user) {
        throw new UnauthorizedException('Email not registered')
      }

      if (user.active === false) {
        throw new BadRequestException('Account is deactivated')
      }

      if (!user.hash || !user.salt) {
        throw new UnauthorizedException('Invalid credentials')
      }

      const hashAttempt = crypto
        .pbkdf2Sync(password, user.salt, 25000, 512, 'sha256')
        .toString('hex')

      if (hashAttempt !== user.hash) {
        userLogger.error(`Login failed: Invalid credentials`, {
          metadata: {
            ...ClientInfo.getClientInfo(req),
            action: 'LOGIN_ERROR',
          },
          request: {
            email,
          },
        })
        throw new UnauthorizedException('Invalid credentials')
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: { signedIn: true },
      })

      const payload = {
        sub: user.id,
        id: user.id,
        email: user.email,
        ownerFirstName: user.firstName,
        ownerLastName: user.lastName,
      }

      const accessToken = await this.generateAccessToken(payload)
      const refreshToken = await this.generateRefreshToken(payload)
      const csrfToken = crypto.randomBytes(32).toString('hex')

      const isProduction = process.env.NODE_ENV === 'production'

      // Cookies consistentes para navegadores con particionado/ETP:
      // - REFRESH-TOKEN: HttpOnly
      // - accesstoken:   HttpOnly
      // - XSRF-TOKEN:    NO HttpOnly (legible por JS para enviar X-XSRF-TOKEN)
      setSecureCookie(
        res,
        'REFRESH-TOKEN',
        refreshToken,
        isProduction,
        /*isPublic*/ false,
      )
      setSecureCookie(
        res,
        'accesstoken',
        accessToken,
        isProduction,
        /*isPublic*/ false,
      )
      setSecureCookie(
        res,
        'XSRF-TOKEN',
        csrfToken,
        isProduction,
        /*isPublic*/ true,
      )

      // No enviar tokens en el body. Devolver solo un mensaje/encrypted meta-info.
      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Login successful',
        email: user.email,
        userId: user.id,
      })

      userLogger.info(`Login successful`, {
        metadata: {
          ...ClientInfo.getClientInfo(req),
          action: 'LOGIN_SUCCESS',
        },
        response: {
          email: user.email,
        },
      })

      res.setHeader('XSRF-TOKEN', csrfToken)

      return { encryptedResponse }
    } catch (error) {
      if (error.status) {
        throw error
      }
      throw new UnauthorizedException('User or password incorrect')
    }
  }

  async validateOrRegisterGoogleUser(googleUser: any, res: Response) {
    console.log('🔍 validateOrRegisterGoogleUser: INICIANDO con usuario:', {
      email: googleUser?.email,
      firstName: googleUser?.firstName,
      lastName: googleUser?.lastName,
    })

    const { email, firstName, lastName, picture, sub: googleId } = googleUser

    const googleEmail = `${email}:google`

    let user = await this.prisma.user.findUnique({
      where: { email: googleEmail },
    })

    if (user && user.active === false) {
      throw new BadRequestException('Account is deactivated')
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleEmail,
          firstName,
          lastName,
          hash: null,
          salt: null,
          role: 'Administrador',
          urlPhoto: picture || null,
          isVerified: true,
          signedIn: true,
          userName: firstName + lastName + googleId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await this.prisma.userProvider.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerId: googleId,
        },
      })

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
    } else {
      // flag de sesión para usuarios ya existentes
      if (!user.signedIn) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { signedIn: true },
        })
      }
    }

    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }

    const accessToken = await this.generateAccessToken(payload)
    const refreshToken = await this.generateRefreshToken(payload)
    const csrfToken = crypto.randomBytes(32).toString('hex')

    const isProduction = process.env.NODE_ENV === 'production'

    console.log(
      '🍪 validateOrRegisterGoogleUser: Seteando cookies HttpOnly...',
      {
        isProduction,
        accessTokenLength: accessToken.length,
        refreshTokenLength: refreshToken.length,
        csrfTokenLength: csrfToken.length,
      },
    )

    // Misma política de cookies que en login
    setSecureCookie(res, 'REFRESH-TOKEN', refreshToken, isProduction, false)
    setSecureCookie(res, 'accesstoken', accessToken, isProduction, false)
    setSecureCookie(res, 'XSRF-TOKEN', csrfToken, isProduction, true)

    console.log('✅ validateOrRegisterGoogleUser: Todas las cookies seteadas')

    // header XSRF para compatibilidad
    res.setHeader('XSRF-TOKEN', csrfToken)

    // No devolver tokens encriptados en el cuerpo - las cookies son suficientes
    return {
      message: 'Google authentication successful',
    }
  }

  // Nuevo: garantiza existencia/actualización de usuario Google sin setear cookies
  async ensureGoogleUser(googleUser: any) {
    console.log('🔍 ensureGoogleUser: INICIANDO con usuario:', {
      email: googleUser?.email,
      firstName: googleUser?.firstName,
      lastName: googleUser?.lastName,
    })

    const { email, firstName, lastName, picture, sub: googleId } = googleUser

    const googleEmail = `${email}:google`

    let user = await this.prisma.user.findUnique({
      where: { email: googleEmail },
    })

    if (user && user.active === false) {
      throw new BadRequestException('Account is deactivated')
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleEmail,
          firstName,
          lastName,
          hash: null,
          salt: null,
          role: 'Administrador',
          urlPhoto: picture || null,
          isVerified: true,
          signedIn: true,
          userName: firstName + lastName + googleId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      await this.prisma.userProvider.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerId: googleId,
        },
      })

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
    } else {
      // asegurar providerId
      const existingProvider = await this.prisma.userProvider.findFirst({
        where: { userId: user.id, provider: 'google' },
      })
      if (!existingProvider) {
        await this.prisma.userProvider.create({
          data: { userId: user.id, provider: 'google', providerId: googleId },
        })
      } else if (!existingProvider.providerId && googleId) {
        await this.prisma.userProvider.update({
          where: { id: existingProvider.id },
          data: { providerId: googleId },
        })
      }

      if (!user.signedIn) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { signedIn: true },
        })
      }
    }

    return user
  }

  // Nuevo: firma ticket corto para handoff Google -> Frontend
  signHandoffTicket(payload: any, secret: string) {
    if (!secret) {
      throw new Error('GOOGLE_HANDOFF_SECRET is not defined')
    }
    return jwt.sign(payload, secret, {
      expiresIn: '90s',
      issuer: 'auth-service',
      audience: 'google_handoff',
    })
  }

  // Nuevo: buscar usuario por id
  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async generateAccessToken(payload: any) {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    })
  }

  async generateRefreshToken(payload: any) {
    return this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '7d',
    })
  }

  async logout(
    req: Request,
    res: Response,
    device: string,
    webBrowser: string,
  ) {
    const isProduction = process.env.NODE_ENV === 'production'
    console.log('🔓 Logout iniciado - isProduction:', isProduction)

    try {
      const user = (req as any).user as { id: string; email: string }

      // Si no se encuentra el usuario, se limpia la sesión igualmente.
      if (!user || !user.id) {
        console.log('🔓 Usuario no encontrado, limpiando cookies...')
        clearSecureCookie(res, 'REFRESH-TOKEN', isProduction)
        clearSecureCookie(res, 'accesstoken', isProduction)
        clearPublicCookie(res, 'XSRF-TOKEN', isProduction)
        console.log('🔓 Cookies limpiadas para usuario no encontrado')
        return { message: 'Sesión cerrada correctamente' }
      }

      // Actualizar el estado del dispositivo actual a "Sesión cerrada"
      const result = await this.prisma.deviceHistory.updateMany({
        where: {
          userId: user.id,
          device,
          webBrowser,
          status: 'Sesión actual',
        },
        data: { status: 'Sesión cerrada', updatedAt: new Date() },
      })

      if (result.count === 0) {
        console.warn('No se encontró ningún registro para actualizar.')
      }

      // Actualizar el estado del usuario en la base de datos
      await this.prisma.user.update({
        where: { id: user.id },
        data: { signedIn: false },
      })

      console.log('🔓 Limpiando cookies para usuario:', user.email)
      clearSecureCookie(res, 'REFRESH-TOKEN', isProduction)
      clearSecureCookie(res, 'accesstoken', isProduction)
      clearPublicCookie(res, 'XSRF-TOKEN', isProduction)
      console.log('🔓 Cookies limpiadas exitosamente')

      userLogger.info(
        `Logout successful for user ${user.email} on device ${device} (${webBrowser})`,
      )

      return { message: 'Sesión cerrada correctamente' }
    } catch (error) {
      userLogger.error(`Error en logout: ${error.message}`)
      console.log('🔓 Error en logout, limpiando cookies de emergencia...')
      // En lugar de lanzar una excepción, se limpian las cookies y se retorna el mensaje
      clearSecureCookie(res, 'REFRESH-TOKEN', isProduction)
      clearSecureCookie(res, 'accesstoken', isProduction)
      clearPublicCookie(res, 'XSRF-TOKEN', isProduction)
      console.log('🔓 Cookies de emergencia limpiadas')
      return { message: 'Sesión cerrada correctamente' }
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const { salt, hash } = this.generateHash(dto.password)

    await this.prisma.user.update({
      where: { id: userId },
      data: { salt, hash },
    })

    const encryptedResponse = this.encryptionService.encrypt({
      message: 'Password updated successfully',
    })

    return { encryptedResponse }
  }

  async sendVerificationCode(
    email: string,
    name: string,
    code: string,
    reason: string,
    customSubject?: string,
    phoneNumber?: string,
    sendBySMS?: boolean,
  ) {
    await this.prisma.verificationCode.upsert({
      where: { email },
      update: {
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
      },
      create: {
        email,
        code,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutos
      },
    })

    //enviar el código por correo electrónico
    if (!sendBySMS) {
      try {
        await this.mailService.sendVerificationCode(
          email,
          name,
          code,
          reason,
          customSubject,
        )
      } catch (error) {
        console.error('Error enviando el correo:', error.message)
        throw new Error('Error sending verification code via email')
      }
    }

    //enviar el código por SMS si el usuario seleccionó la opción
    if (sendBySMS && phoneNumber) {
      try {
        console.log(`Intentando enviar SMS a ${phoneNumber}...`)

        const messageBody = `Hola ${name}, tu código de verificación es: ${code}. Es válido por 10 minutos.`

        const response = await this.twilioService.sendSms(
          phoneNumber,
          messageBody,
        )

        console.log(`Código de verificación enviado por SMS a ${phoneNumber}`)

        if (response.status === 'undelivered' || response.status === 'failed') {
          console.error('Error en la entrega del SMS:', response.errorMessage)
          throw new Error('SMS delivery failed')
        }
      } catch (error) {
        console.error('Error enviando el SMS:', error.message)
        throw new Error('Error sending verification code via SMS')
      }
    }

    const encryptedResponse = this.encryptionService.encrypt({
      message: 'Verification code sent successfully',
    })

    return { encryptedResponse }
  }

  async verifyCode(email: string, code: string) {
    const entry = await this.prisma.verificationCode.findUnique({
      where: { email },
    })

    if (!entry) {
      throw new NotFoundException('No verification code found')
    }

    if (entry.expiresAt < new Date()) {
      await this.prisma.verificationCode.delete({ where: { email } })
      throw new BadRequestException('Code has expired')
    }

    if (entry.code !== code) {
      throw new BadRequestException('Invalid code')
    }

    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true },
    })

    await this.prisma.verificationCode.delete({ where: { email } })

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in the environment variables')
    }
    const resetToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: '15m',
    })

    const encryptedResponse = this.encryptionService.encrypt({
      message: 'Code verified successfully',
      resetToken,
    })

    return { encryptedResponse }
  }

  async resetPassword(resetToken: string, newPassword: string) {
    try {
      // Verifica y decodifica el token de reseteo
      const payload = jwt.verify(
        resetToken,
        process.env.JWT_SECRET ||
          (() => {
            throw new Error(
              'JWT_SECRET is not defined in the environment variables',
            )
          })(),
      ) as unknown as {
        userId: string
      }

      // Busca el usuario por el id extraído del token
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      })

      if (!user) {
        throw new NotFoundException('User not found')
      }

      // Genera el nuevo hash y salt de la contraseña
      const { salt, hash } = this.generateHash(newPassword)

      // Actualiza la contraseña del usuario
      await this.prisma.user.update({
        where: { id: user.id },
        data: { salt, hash },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Password updated successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired reset token')
    }
  }

  async generateInvitationTokens(invitedUserData: {
    id: string
    email: string
    firstName: string
    lastName: string
  }): Promise<{
    encryptedAccessToken: string
    encryptedRefreshToken: string
    encryptedCsrfToken: string
  }> {
    // Genera el payload a partir de la info del usuario invitado:
    const payload = {
      sub: invitedUserData.id,
      email: invitedUserData.email,
      firstName: invitedUserData.firstName,
      lastName: invitedUserData.lastName,
    }

    const accessToken = await this.generateAccessToken(payload)
    const refreshToken = await this.generateRefreshToken(payload)
    const csrfToken = crypto.randomBytes(32).toString('hex')

    // Encriptamos los tokens y retornamos el resultado.
    const encryptedAccessToken = this.encryptionService.encrypt(accessToken)
    const encryptedRefreshToken = this.encryptionService.encrypt(refreshToken)
    const encryptedCsrfToken = this.encryptionService.encrypt(csrfToken)

    return { encryptedAccessToken, encryptedRefreshToken, encryptedCsrfToken }
  }
}
