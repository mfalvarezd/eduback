import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, ExtractJwt } from 'passport-jwt'
import { Request } from 'express'

@Injectable()
export class JwtStrategyRefresh extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req && req.cookies) {
            return req.cookies['REFRESH-TOKEN']
          }
          return null
        },
      ]),
      secretOrKey: process.env.JWT_SECRET || 'defaultRefreshSecret',
      passReqToCallback: true,
    })
  }

  async validate(req: Request, payload: any) {
    console.log('Payload recibido en JwtStrategyRefresh:', payload)
    if (!payload) {
      throw new Error('Invalid refresh token')
    }
    return { id: payload.sub, email: payload.email }
  }
}
