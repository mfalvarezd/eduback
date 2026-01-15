import { IsString, IsEnum, IsOptional } from 'class-validator'
import { SubscriptionType } from '@prisma/client'

export class UpdateSubscriptionBaseDto {
  @IsOptional()
  @IsEnum(SubscriptionType, {
    message: 'Type must be INDIVIDUAL or ENTERPRISE',
  })
  type?: SubscriptionType

  @IsOptional()
  @IsString()
  status?: string
}
