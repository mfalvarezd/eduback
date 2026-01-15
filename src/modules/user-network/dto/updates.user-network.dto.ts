import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdateUserNetworkDto {
  @IsOptional()
  @IsString()
  network?: string

  @IsOptional()
  @IsBoolean()
  connection?: boolean
}
