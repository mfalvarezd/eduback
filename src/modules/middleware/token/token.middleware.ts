import { Injectable, NestMiddleware } from '@nestjs/common'
import axios from 'axios'
import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import { AuthService } from 'src/modules/auth/auth.service'
import { setSecureCookie } from 'src/utils/cookie-helper'

@Injectable()
export class TokenMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Permitir inmediatamente para OPTIONS
    if (req.method === 'OPTIONS') {
      return next()
    }
    const authHeader = req.headers['authorization']
    let refreshToken = req.cookies['REFRESH-TOKEN']

    // Plan B: buscar en headers personalizados para compatibilidad con Brave/Safari
    if (!refreshToken && req.headers['x-refresh-token']) {
      refreshToken = req.headers['x-refresh-token'] as string
      console.log(
        '[Middleware] Refresh token encontrado en header personalizado',
      )
    }

    // Plan C: buscar en el cuerpo de la solicitud para el endpoint de refresh
    if (
      !refreshToken &&
      req.path === '/auth/refresh' &&
      req.body &&
      req.body.refreshToken
    ) {
      refreshToken = req.body.refreshToken
      console.log(
        '[Middleware] Refresh token encontrado en el cuerpo de la solicitud',
      )
    }

    const secret = process.env.JWT_SECRET

    // Rutas públicas
    if (
      req.path.startsWith('/auth/google') || // incluye /auth/google y /auth/google/callback
      req.path.startsWith('/auth/google/finalize') ||
      req.path.startsWith('/auth/login') ||
      req.path.startsWith('/auth/register') ||
      req.path.startsWith('/auth/invite-login') ||
      req.path.startsWith('/auth/send-verification-code') ||
      req.path.startsWith('/auth/verify-code') ||
      req.path.startsWith('/auth/reset-password') ||
      req.path.startsWith('/auth/debug-cookies') ||
      req.path.startsWith('/payments/webhook') ||
      req.path.startsWith('/static/') ||
      req.path === '/auth/refresh'
    ) {
      return next()
    }

    if (!secret) {
      console.error('[Middleware] No se ha definido un JWT_SECRET')
      return res
        .status(500)
        .json({ message: 'Error interno del servidor: JWT_SECRET no definido' })
    }

    // Verificar si hay algún token disponible (cookies, headers, o localStorage)
    const hasAnyToken =
      authHeader ||
      refreshToken ||
      req.cookies['accesstoken'] ||
      req.headers['x-access-token'] ||
      (req.path === '/auth/refresh' && req.body && req.body.refreshToken)

    if (!hasAnyToken) {
      console.warn(
        '[Middleware] No hay ningún token disponible (authHeader, refreshToken, cookies, o localStorage)',
      )
      return res
        .status(401)
        .json({ message: 'No autorizado: Token inválido o expirado' })
    }

    let accessToken = authHeader?.split(' ')[1]

    if (!accessToken) {
      accessToken = req.cookies['accesstoken']
    }

    // Plan B: buscar en headers personalizados (localStorage)
    if (!accessToken) {
      accessToken = req.headers['x-access-token'] as string
    }

    if (accessToken) {
      try {
        const decoded = jwt.verify(accessToken, secret)
        req['user'] = decoded
        req.headers['authorization'] = `Bearer ${accessToken}`

        const exp = decoded['exp']
        const currentTime = Math.floor(Date.now() / 1000)
        const remainingTime = exp - currentTime

        console.log(
          `[Middleware] Tiempo restante del Access Token: ${remainingTime} segundos`,
        )

        if (remainingTime > 600) {
          console.log('[Middleware] Access Token aún válido, continuando...')
          return next()
        }
      } catch (error) {
        if (error.name !== 'TokenExpiredError') {
          console.warn(`[Middleware] Access Token inválido: ${error.message}`)
          return res
            .status(401)
            .json({ message: 'No autorizado: Token inválido' })
        }

        console.warn(
          '[Middleware] Access Token ha expirado, intentando refrescar...',
        )
      }
    }

    if (refreshToken) {
      try {
        const refreshDecoded: any = jwt.verify(refreshToken, secret)

        const refreshExp = refreshDecoded.exp
        const currentTime = Math.floor(Date.now() / 1000)
        const refreshRemainingTime = refreshExp - currentTime

        console.log(
          `[Middleware] Tiempo restante del Refresh Token: ${refreshRemainingTime} segundos`,
        )

        console.log('[Middleware] Generando nuevo Refresh Token...')
        const newRefreshToken = await this.authService.generateRefreshToken({
          sub: refreshDecoded.sub,
          email: refreshDecoded.email,
          firstName: refreshDecoded.firstName,
          lastName: refreshDecoded.lastName,
        })

        const isProduction = process.env.NODE_ENV === 'production'

        // Usar helper para cookies compatibles con Brave/Safari
        setSecureCookie(
          res,
          'REFRESH-TOKEN',
          newRefreshToken,
          isProduction,
          false,
        )

        console.log(
          '[Middleware] Nuevo Refresh Token generado y almacenado en cookie',
        )

        const newAccessToken = await this.authService.generateAccessToken({
          sub: refreshDecoded.sub,
          email: refreshDecoded.email,
          firstName: refreshDecoded.firstName,
          lastName: refreshDecoded.lastName,
        })

        console.log(`[Middleware] Nuevo Access Token generado correctamente`)

        req['user'] = jwt.verify(newAccessToken, secret)

        req.headers['authorization'] = `Bearer ${newAccessToken}`
        res.setHeader('Authorization', `Bearer ${newAccessToken}`)

        axios.defaults.headers.common['Authorization'] =
          `Bearer ${newAccessToken}`

        // Usar helper para cookies compatibles con Brave/Safari
        // Escribir access token como HttpOnly (isPublic=false). No escribir cookies públicas aquí.
        setSecureCookie(res, 'accesstoken', newAccessToken, isProduction, false)

        console.log(
          '[Middleware] Axios y cookie actualizados con nuevo Access Token',
        )

        return next()
      } catch (error) {
        console.error(
          `[Middleware] Refresh Token inválido o expirado: ${error.message}`,
        )

        res.clearCookie('REFRESH-TOKEN')
        res.clearCookie('accesstoken')
        res.clearCookie('XSRF-TOKEN')

        console.log(
          '[Middleware] Refresh Token inválido o expirado, cerrando sesión',
        )

        return res
          .status(401)
          .json({ message: 'No autorizado: Token inválido o expirado' })
      }
    }

    console.warn('[Middleware] No se pudo validar ni refrescar el token')
    return res
      .status(401)
      .json({ message: 'No autorizado: Token inválido o expirado' })
  }
}
