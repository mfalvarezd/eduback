import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common'
import { Response } from 'express'
import {
  userLogger,
  subscriptionBaseLogger,
  subscriptionGroupLogger,
  groupLogger,
  projectLogger,
  folderLogger,
  canvasLogger,
  companyLogger,
  planLogger,
  companyProductLogger,
  settingsLogger,
  userProviderLogger,
} from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Catch(HttpException)
export class ErrorHandler implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()
    const status = exception.getStatus()
    const exceptionResponse = exception.getResponse() as any

    const actionMap = {
      '/auth/register': 'REGISTER',
      '/auth/login': 'LOGIN',
      '/subscription-base': 'SUBSCRIPTION_BASE',
      '/subscription-group': 'SUBSCRIPTION_GROUP',
      '/group-users': 'GROUP_USER',
      '/projects': 'PROJECT',
      '/folders': 'FOLDER',
      '/canvas': 'CANVAS',
      '/companies': 'COMPANY',
      '/plans': 'PLAN',
      '/products': 'PRODUCT',
      '/settings': 'SETTINGS',
      '/user-provider': 'USER_PROVIDER',
    }

    const path = request.path
    const baseAction = actionMap[path] || 'API'
    const action = `${baseAction}_ERROR`

    const errorMessage = Array.isArray(exceptionResponse.message)
      ? exceptionResponse.message.join(', ')
      : exceptionResponse.message

    const errorContext = {
      metadata: {
        ...ClientInfo.getClientInfo(request),
        action,
        errorType: exception.name,
        statusCode: status,
        method: request.method,
      },
      request: request.body,
      error: {
        type: exceptionResponse.error || 'Bad Request',
        details: errorMessage,
        statusCode: status,
      },
    }

    switch (true) {
      case path.includes('/auth'):
        userLogger.error(`Error in authentication`, errorContext)
        break
      case path.includes('/subscription-base'):
        subscriptionBaseLogger.error(`Error in subscription base`, errorContext)
        break
      case path.includes('/subscription-group'):
        subscriptionGroupLogger.error(
          `Error in subscription group`,
          errorContext,
        )
        break
      case path.includes('/group-users'):
        groupLogger.error(`Error in group users`, errorContext)
        break
      case path.includes('/projects'):
        projectLogger.error(`Error in projects`, errorContext)
        break
      case path.includes('/folders'):
        folderLogger.error(`Error in folders`, errorContext)
        break
      case path.includes('/canvas'):
        canvasLogger.error(`Error in canvas`, errorContext)
        break
      case path.includes('/companies'):
        companyLogger.error(`Error in companies`, errorContext)
        break
      case path.includes('/plans'):
        planLogger.error(`Error in plans`, errorContext)
        break
      case path.includes('/products'):
        companyProductLogger.error(`Error in products`, errorContext)
        break
      case path.includes('/settings'):
        settingsLogger.error(`Error in settings`, errorContext)
        break
      case path.includes('/user-provider'):
        userProviderLogger.error(`Error in user provider`, errorContext)
        break
    }

    response.status(status).json(exceptionResponse)
  }
}
