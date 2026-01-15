import { IsOptional, IsString } from 'class-validator'

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  readonly moveToId?: string

  @IsOptional()
  @IsString()
  readonly name?: string
}