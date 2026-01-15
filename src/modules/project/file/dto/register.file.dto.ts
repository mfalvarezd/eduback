import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class RegisterFileDto {
  @IsOptional()
  @IsString()
  folderId?: string

  @IsNotEmpty()
  @IsString()
  projectId: string

  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @IsString()
  url: string
  
  @IsNotEmpty()
  @IsString()
  type: string
}
