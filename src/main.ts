import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { NestExpressApplication } from '@nestjs/platform-express'
import { ErrorHandler } from './errors'
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { join } from 'path'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  })

  // Habilita CORS globalmente con configuración más permisiva para producción
  const allowedOrigins =
    process.env.NODE_ENV === 'production'
      ? [
          'https://dashboard-backend-sow3.onrender.com',
          'https://dashboard-frontend-9dpx.onrender.com',
          'http://localhost:8882',
          'http://localhost:5173',
          'https://accounts.google.com',
          'https://registra-frontend.onrender.com',
          'http://localhost:8888',
          'http://localhost:3002',
          // Agregar dominios adicionales para mayor compatibilidad
          'https://*.onrender.com',
        ]
      : [
          'http://localhost:3000',
          'http://localhost:5173',
          'http://localhost:8882',
          'https://dashboard-backend-sow3.onrender.com',
          'https://accounts.google.com',
          'https://registra-frontend.onrender.com',
          'http://localhost:8888',
          'http://localhost:3002',
        ]

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin like mobile apps or curl
      if (!origin) return callback(null, true)

      const allowed = allowedOrigins
      // If the origin is in the allowed list, allow it
      if (allowed.includes(origin)) return callback(null, true)

      // Fallback: deny
      return callback(new Error('CORS policy: Origin not allowed'), false)
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-XSRF-TOKEN', // Permitir header XSRF
      'x-csrf-token',
      'x-csrf-token-local',
      'x-xsrf-token',
      'x-access-token',
      'x-refresh-token',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    exposedHeaders: ['Authorization', 'XSRF-TOKEN', 'Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })

  // Middleware adicional para manejar OPTIONS requests
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      const requestOrigin = req.headers.origin as string
      console.log(
        'Handling OPTIONS request for:',
        req.path,
        'origin:',
        requestOrigin,
      )

      // If origin is allowed, echo it back; otherwise don't set CORS headers
      if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
        res.header('Access-Control-Allow-Origin', requestOrigin)
      }
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      )
      res.header(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-XSRF-TOKEN, x-csrf-token, x-xsrf-token, Accept, Origin, X-Requested-With',
      )
      res.header('Access-Control-Allow-Credentials', 'true')
      res.header('Access-Control-Max-Age', '86400')
      return res.status(204).end()
    }
    next()
  })

  // Global middleware to ensure ACAO is present on all responses (including redirects)
  // This echoes the incoming Origin when allowed and sets credentials + Vary header.
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin as string
    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin)
      res.header('Access-Control-Allow-Credentials', 'true')
      // Ensure caches vary by origin
      res.header('Vary', 'Origin')
      // Expose Set-Cookie header to client-side (useful for debugging)
      res.header('Access-Control-Expose-Headers', 'Set-Cookie, XSRF-TOKEN')
    }
    next()
  })

  // webhooks stripe, bodyParser, global filters, etc.
  app.use(
    '/payments/webhook',
    express.raw({
      type: 'application/json',
      verify: (req: any, res, buf) => {
        req.rawBody = buf
      },
    }),
  )

  app.use(bodyParser.json({ limit: '50mb' }))
  app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))

  app.useGlobalFilters(new ErrorHandler())

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  if (process.env.NODE_ENV === 'production') {
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: 'Demasiados intentos, por favor intente nuevamente más tarde.',
    })
    app.use('/auth/login', authLimiter)
    app.use('/auth/register', authLimiter)
  }

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  )

  app.set('trust proxy', 1)

  app.use(cookieParser())

  app.use('/static', express.static(join(process.cwd(), 'public')))

  // Middleware para logging de requests en producción
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      console.log(
        `${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`,
      )

      // DEBUGGING: Mostrar cookies en cada request
      if (
        req.method === 'GET' &&
        (req.path === '/auth/me' ||
          req.path === '/settings' ||
          req.path === '/notification')
      ) {
        console.log('🔍 DEBUGGING - Cookies recibidas en request:', req.path)
        console.log(
          '🔍 DEBUGGING - req.cookies:',
          Object.keys(req.cookies || {}),
        )
        console.log(
          '🔍 DEBUGGING - Cookie accesstoken presente:',
          !!req.cookies?.['accesstoken'],
        )
        console.log(
          '🔍 DEBUGGING - Headers Cookie:',
          req.headers.cookie ? 'Presente' : 'Ausente',
        )
      }

      next()
    })
  }

  if (typeof global.gc === 'function') {
    setInterval(() => {
      console.log('Running garbage collection...')
      if (global.gc) {
        global.gc()
      }
    }, 60000)
  } else {
    console.warn('Garbage Collector is not enabled. Start with --expose-gc')
  }

  const PORT = process.env.PORT || 3000
  await app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    console.log(`Environment: ${process.env.NODE_ENV}`)
    console.log(`CORS enabled for origins:`, allowedOrigins)
  })
}

bootstrap()
