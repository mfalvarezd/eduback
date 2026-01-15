import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import * as crypto from 'crypto'
import { setSecureCookie } from 'src/utils/cookie-helper'

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Permitir inmediatamente para OPTIONS
    if (req.method === 'OPTIONS') {
      return next()
    }

    const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE']
    const isSafeMethod = safeMethods.includes(req.method)

    if (isSafeMethod) {
      return next()
    }

    // Excluir canje de ticket Google del chequeo CSRF
    if (req.path.startsWith('/auth/google/finalize')) {
      return next()
    }

    let csrfToken = req.cookies ? req.cookies['XSRF-TOKEN'] : null
    const csrfTokenFromHeader = req.headers['x-csrf-token']

    // Plan B: buscar en headers personalizados (localStorage)
    if (!csrfToken) {
      csrfToken = req.headers['x-csrf-token-local'] as string
    }

    if (!csrfToken) {
      csrfToken = this.generateToken()
      const isProduction = process.env.NODE_ENV === 'production'

      // Usar helper para cookies compatibles con Brave/Safari
      setSecureCookie(res, 'XSRF-TOKEN', csrfToken, isProduction, true)
    }

    ;(req as any).csrfToken = () => csrfToken

    res.setHeader('XSRF-TOKEN', csrfToken)

    if (csrfTokenFromHeader && csrfTokenFromHeader !== csrfToken) {
      return res.status(403).json({ message: 'CSRF token inválido' })
    }

    return next()
  }
}
