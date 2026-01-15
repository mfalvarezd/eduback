import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { UsersService } from '../../users/users.service'
import { Request } from 'express'

@Injectable()
export class JwtStrategyAccess extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primero intentar extraer de cookie HttpOnly
        (request: Request) => {
          console.log(
            '🔍 JWT Strategy: EJECUTÁNDOSE - Intentando extraer token...',
          )
          console.log('🔍 JWT Strategy: URL:', request.url)
          console.log('🔍 JWT Strategy: Method:', request.method)

          const token = request?.cookies?.['accesstoken']
          console.log(
            '🔍 JWT Strategy: Token de cookie accesstoken:',
            token ? `Encontrado (${token.length} chars)` : 'No encontrado',
          )
          console.log(
            '🔍 JWT Strategy: Todas las cookies:',
            Object.keys(request?.cookies || {}),
          )
          console.log(
            '🔍 JWT Strategy: Headers Cookie:',
            request.headers.cookie ? 'Presente' : 'Ausente',
          )

          if (token) {
            console.log(
              '✅ JWT Strategy: Token encontrado, devolviendo para validación',
            )
          } else {
            console.log('❌ JWT Strategy: No se encontró token en cookies')
          }

          return token
        },
        // Fallback: extraer del header Authorization (para compatibilidad)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_SECRET || 'defaultSecret',
    })
  }

  async validate(payload: any) {
    const user = await this.usersService.findByEmail(payload.email)
    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    const { hash, salt, ...result } = user
    return result
  }
}
