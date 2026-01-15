import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common'
import { CsrfMiddleware } from './csrf.middleware'

@Module({})
export class CsrfModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        { path: '/auth/login', method: RequestMethod.ALL },
        { path: '/auth/register', method: RequestMethod.ALL },
        { path: '/auth/google', method: RequestMethod.ALL },
        { path: '/auth/google/callback', method: RequestMethod.ALL },
        { path: '/auth/refresh', method: RequestMethod.ALL },
        { path: '/static', method: RequestMethod.ALL },
        { path: '/auth/verify-code', method: RequestMethod.ALL },
        { path: '/auth/send-verification-code', method: RequestMethod.ALL },
        { path: '/products/create', method: RequestMethod.ALL },
        { path: '/auth/logout', method: RequestMethod.ALL },
        { path: '/auth/reset-password', method: RequestMethod.ALL },
        { path: '/auth/invite-login', method: RequestMethod.ALL },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL })
  }
}
