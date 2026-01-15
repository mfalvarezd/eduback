import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdateUserDeviceDto {
  @IsOptional()
  @IsString()
  device?: string

  @IsOptional()
  @IsBoolean()
  active?: boolean
}
