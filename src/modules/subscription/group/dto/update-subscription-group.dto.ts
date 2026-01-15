import { IsString, IsOptional } from 'class-validator'

export class UpdateSubscriptionGroupDto {
  @IsOptional()
  @IsString()
  planId?: string

  @IsOptional()
  @IsString()
  ownerId?: string
}
