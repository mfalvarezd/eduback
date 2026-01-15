import { IsOptional, IsString, IsDate } from 'class-validator'
import { Type } from 'class-transformer'

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  readonly moveToId?: string

  @IsOptional()
  @IsString()
  readonly name?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly openedAt?: Date
}
