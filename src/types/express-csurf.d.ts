import { Request } from 'express'
import { User } from '../users/entities/user.entity'

declare module 'express' {
  export interface Request {
    csrfToken: () => string
    cookies: { [key: string]: string }
  }
}
