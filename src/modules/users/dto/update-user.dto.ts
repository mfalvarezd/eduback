import { IsOptional, IsString, IsDate } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateUserDto {
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
  country?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  userName?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthday?: Date

  @IsOptional()
  @IsString()
  role?: string

  @IsOptional()
  @IsString()
  job?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsString()
  type?: string
}
