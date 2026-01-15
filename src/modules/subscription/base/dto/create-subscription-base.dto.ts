import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator'
import { SubscriptionType } from '@prisma/client'

export class CreateSubscriptionBaseDto {
  @IsString()
  @IsNotEmpty({ message: 'PlanId is required' })
  planId: string

  @IsEnum(SubscriptionType, {
    message: 'Type must be INDIVIDUAL or ENTERPRISE',
  })
  type: SubscriptionType

  @IsOptional()
  @IsString()
  status?: string
}
