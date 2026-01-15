import { IsOptional, IsString } from 'class-validator'

export class UpdateMemberInfoDto {
  @IsOptional()
  @IsString()
  firstName?: string

  @IsOptional()
  @IsString()
  lastName?: string

  @IsOptional()
  @IsString()
  cellphone?: string

  @IsOptional()
  @IsString()
  email?: string

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsString()
  job?: string

  @IsOptional()
  @IsString()
  birthday?: string

  @IsOptional()
  @IsString()
  companyId?: string

  @IsOptional()
  @IsString()
  companyName?: string
}
