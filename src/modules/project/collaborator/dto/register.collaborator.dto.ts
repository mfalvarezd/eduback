import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
} from 'class-validator'

export class RegisterCollaboratorDto {
  @IsNotEmpty()
  @IsEmail()
  collaboratorEmail: string

  @IsNotEmpty()
  @IsString()
  accessType: string

  @IsString()
  @IsOptional()
  message?: string

  @IsArray()
  @IsOptional()
  foldersId?: string[]

  @IsArray()
  @IsOptional()
  filesId?: string[]
}
