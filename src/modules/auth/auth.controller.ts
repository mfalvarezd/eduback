import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common'
import { Response, Request as ExpressRequest } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { AuthGuard } from '@nestjs/passport'
import { RegisterDto } from './dto/register.user.dto'
import { userLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'
import { ConfigService } from '@nestjs/config'
import { constants } from 'buffer'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import * as crypto from 'crypto'
import { SendVerificationCodeDto } from './dto/send-verification-code.dto'
import { VerifyCodeDto } from './dto/verify-code.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { DeviceHistoryService } from '../device-history/device-history.service'
import { setSecureCookie } from '../../utils/cookie-helper'
import * as jwt from 'jsonwebtoken'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    readonly encryptionService: EncryptionService,
    private readonly deviceHistoryService: DeviceHistoryService,
  ) {
    interface State {
      redirect: string
    }
  }

  @Get('debug-cookies')
  async debugCookies(@Req() req: Request, @Res() res: Response) {
    // Log de cookies recibidas
    console.log('🔍 [DEBUG-COOKIES] Cookies recibidas:', (req as any).cookies)
    console.log('🔍 [DEBUG-COOKIES] Headers de request:', req.headers)

    // Setear cookies de prueba
    const isProduction = process.env.NODE_ENV === 'production'
    setSecureCookie(res, 'DEBUG-COOKIE', 'debug-value', isProduction, false)
    setSecureCookie(res, 'DEBUG-PUBLIC', 'debug-public', isProduction, true)

    // Log de headers de respuesta
    console.log('🔍 [DEBUG-COOKIES] Headers de respuesta:', res.getHeaders())

    return res.status(200).json({
      message: 'Debug cookies endpoint',
      cookiesReceived: (req as any).cookies,
      requestHeaders: req.headers,
      responseHeaders: res.getHeaders(),
    })
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    userLogger.info(`Starting user registration`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'REGISTER_USER',
      },
      request: {
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        country: registerDto.country || 'Not specified',
        city: registerDto.city || 'Not specified',
      },
    })

    const result = await this.authService.register(registerDto)

    userLogger.info(`User registered successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'REGISTER_USER_SUCCESS',
      },
      response: {
        email: result.response_encrypted.email,
      },
    })

    return result
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin(@Req() req, @Res() res: Response): Promise<any> {
    return res.sendStatus(HttpStatus.OK)
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    console.log('🔍 Google OAuth Callback: Iniciando handoff por ticket...')
    console.log('🔍 Google OAuth: Datos del usuario (parciales):', {
      email: req.user?.email,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
    })

    // Garantiza el usuario sin setear cookies
    const user = await this.authService.ensureGoogleUser(req.user)

    // Firmar ticket corto
    const secret = this.configService.get<string>('GOOGLE_HANDOFF_SECRET', '')
    if (!secret) {
      throw new UnauthorizedException('Server misconfiguration')
    }
    const ticket = this.authService.signHandoffTicket({ uid: user.id }, secret)

    let redirectUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173'
    redirectUrl += `/login?from=google&ticket=${encodeURIComponent(ticket)}`

    console.log(
      '🔍 Google OAuth: Redirigiendo a frontend con ticket (no log): ✓',
    )
    return res.redirect(redirectUrl)
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res() res: Response,
    @Request() req,
  ) {
    const loginResult = await this.authService.login(loginDto, res, req)

    return res.status(HttpStatus.OK).json({
      ...loginResult,
    })
  }

  // Nuevo endpoint para finalizar login de Google iniciado desde el front con ticket corto
  @Post('google/finalize')
  @HttpCode(HttpStatus.OK)
  async finalizeGoogle(@Body() body: { ticket: string }, @Res() res: Response) {
    const { ticket } = body || ({} as any)

    if (!ticket) {
      throw new UnauthorizedException('Missing ticket')
    }

    const secret = process.env.GOOGLE_HANDOFF_SECRET
    if (!secret) {
      throw new UnauthorizedException('Server misconfiguration')
    }

    try {
      const decoded: any = jwt.verify(ticket, secret, {
        issuer: 'auth-service',
        audience: 'google_handoff',
      })

      const user = await this.authService.findUserById(decoded.uid)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      const payload = {
        sub: user.id,
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }

      const accessToken = await this.authService.generateAccessToken(payload)
      const refreshToken = await this.authService.generateRefreshToken(payload)
      const csrfToken = crypto.randomBytes(32).toString('hex')

      const isProduction = process.env.NODE_ENV === 'production'

      // Cookies HttpOnly Partitioned para auth; XSRF pública sin Partitioned
      setSecureCookie(res, 'REFRESH-TOKEN', refreshToken, isProduction, false)
      setSecureCookie(res, 'accesstoken', accessToken, isProduction, false)
      setSecureCookie(res, 'XSRF-TOKEN', csrfToken, isProduction, true)

      res.setHeader('XSRF-TOKEN', csrfToken)

      return res.status(HttpStatus.OK).json({
        message: 'Google session established',
      })
    } catch (err) {
      console.warn('🔐 finalizeGoogle: verify ticket error:', {
        name: err?.name,
        message: err?.message,
      })
      throw new UnauthorizedException('Invalid or expired ticket')
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      // 1) Tomar refresh token SOLO desde cookie HttpOnly
      const refreshToken = (req as any).cookies?.['REFRESH-TOKEN']
      if (!refreshToken) {
        throw new UnauthorizedException('There is no refresh token')
      }

      // 2) Verificar JWT del refresh
      const secret = process.env.JWT_SECRET
      if (!secret) {
        throw new Error('JWT_SECRET is not defined')
      }

      let decoded: any
      try {
        decoded = jwt.verify(refreshToken, secret)
      } catch {
        throw new UnauthorizedException('Invalid or expired refresh token')
      }

      // 3) Generar nuevos tokens (puedes rotar refresh aquí)
      const payload = {
        sub: decoded.sub,
        id: decoded.id,
        email: decoded.email,
        firstName: decoded.firstName,
        lastName: decoded.lastName,
      }

      // Ideal: access 10–15m; refresh 7d (rotativo)
      const newAccessToken = await this.authService.generateAccessToken(payload)
      const newRefreshToken =
        await this.authService.generateRefreshToken(payload)
      const newCsrfToken = crypto.randomBytes(32).toString('hex')

      const isProduction = process.env.NODE_ENV === 'production'

      // 4) Setear cookies correctamente
      // Refresh -> HttpOnly = true
      setSecureCookie(
        res,
        'REFRESH-TOKEN',
        newRefreshToken,
        isProduction,
        false,
      )
      // Access -> HttpOnly = true (unificado: 'accesstoken')
      setSecureCookie(res, 'accesstoken', newAccessToken, isProduction, false)
      // CSRF -> HttpOnly = false (debe ser legible por el front)
      setSecureCookie(res, 'XSRF-TOKEN', newCsrfToken, isProduction, true)

      // (Opcional) espejo para SPA
      res.setHeader('XSRF-TOKEN', newCsrfToken)

      // 5) No devolver tokens en body
      return { message: 'Refreshed' }
    } catch (err) {
      // No imprimas cookies o tokens en logs
      if (err instanceof UnauthorizedException) {
        throw err
      }
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Request() req) {
    console.log(
      '🔍 /auth/me: Cookies recibidas:',
      Object.keys(req.cookies || {}),
    )
    console.log(
      '🔍 /auth/me: Cookie accesstoken presente:',
      !!req.cookies?.['accesstoken'],
    )
    console.log(
      '🔍 /auth/me: Cookie REFRESH-TOKEN presente:',
      !!req.cookies?.['REFRESH-TOKEN'],
    )
    console.log('🔍 /auth/me: Usuario autenticado:', {
      id: req.user?.id,
      email: req.user?.email,
    })

    try {
      const user = req.user

      if (!user) {
        console.log('🔍 /auth/me: Usuario no encontrado en req.user')
        throw new UnauthorizedException('User not found')
      }

      // Devolver información básica del usuario (sin datos sensibles)
      const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company || null,
        isVerified: user.isVerified,
        urlPhoto: user.urlPhoto || null,
      }

      const isProduction = process.env.NODE_ENV === 'production'

      // En desarrollo, devolver datos sin encriptar para simplificar
      if (!isProduction) {
        return {
          user: userData,
          message: 'User data retrieved successfully',
        }
      }

      // En producción, encriptar la respuesta
      const encryptedResponse = this.encryptionService.encrypt({
        user: userData,
        message: 'User data retrieved successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      userLogger.error(`Error getting current user: ${error.message}`)
      throw new UnauthorizedException('Unable to get user information')
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    console.log('🔓 Controller: Logout request recibido')
    console.log('🔓 Cookies recibidas:', (req as any).cookies)
    console.log('🔓 Headers auth:', req.headers['authorization'])

    try {
      const { device, webBrowser } =
        this.deviceHistoryService.getDeviceInfo(req)

      const result = await this.authService.logout(
        req as unknown as ExpressRequest,
        res,
        device,
        webBrowser,
      )

      return res.status(HttpStatus.OK).json(result)
    } catch (error) {
      console.error('Error en logout:', error)
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Error al cerrar sesión' })
    }
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    const userId = req.user.id
    return this.authService.changePassword(userId, dto)
  }

  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.resetToken, body.newPassword)
  }

  @Post('send-verification-code')
  async sendVerificationCode(@Body() body: SendVerificationCodeDto) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    return this.authService.sendVerificationCode(
      body.email,
      body.name,
      code,
      body.reason,
      body.customSubject, // Se pasa si existe
      body.phoneNumber,
      body.sendBySMS,
    )
  }

  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto.email, dto.code)
  }

  @Post('invite-member')
  async inviteMember(
    @Body()
    inviteData: {
      id: string
      email: string
      firstName: string
      lastName: string
    },
    @Res() res: Response,
  ) {
    // Como el usuario ya se creó, usamos directamente los datos del body.
    const tokens = await this.authService.generateInvitationTokens({
      id: inviteData.id,
      email: inviteData.email,
      firstName: inviteData.firstName,
      lastName: inviteData.lastName,
    })

    // Construye el link de invitación con estos tokens
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || ''
    const invitationLink =
      `${frontendUrl}/login?from=invitation` +
      `&accessToken=${encodeURIComponent(tokens.encryptedAccessToken)}` +
      `&refreshToken=${encodeURIComponent(tokens.encryptedRefreshToken)}` +
      `&csrfToken=${encodeURIComponent(tokens.encryptedCsrfToken)}`

    return res.status(HttpStatus.OK).json({ invitationLink })
  }

  @Post('invite-login')
  async inviteLogin(
    @Query('accessToken') accessToken: string,
    @Query('refreshToken') refreshToken: string,
    @Query('csrfToken') csrfToken: string,
    @Res() res: Response,
  ) {
    const isProduction = process.env.NODE_ENV === 'production'

    // Decriptar en producción
    const finalAccessToken = isProduction
      ? this.encryptionService.decrypt(accessToken)
      : accessToken
    const finalRefreshToken = isProduction
      ? this.encryptionService.decrypt(refreshToken)
      : refreshToken
    const finalCsrfToken = isProduction
      ? this.encryptionService.decrypt(csrfToken)
      : csrfToken

    // Usar helper para cookies compatibles con Brave/Safari
    setSecureCookie(
      res,
      'REFRESH-TOKEN',
      finalRefreshToken,
      isProduction,
      false,
    )
    setSecureCookie(res, 'XSRF-TOKEN', finalCsrfToken, isProduction, true)
    setSecureCookie(res, 'accesstoken', finalAccessToken, isProduction, false)

    return res.status(HttpStatus.OK).json({
      message: 'Cookies creadas correctamente',
    })
  }
}
