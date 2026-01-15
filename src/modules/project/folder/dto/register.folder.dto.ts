import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class RegisterFolderDto {
  @IsOptional()
  @IsString()
  folderId?: string

  @IsNotEmpty()
  @IsString()
  name: string
}
