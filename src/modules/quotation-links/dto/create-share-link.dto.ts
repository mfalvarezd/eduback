import { IsOptional, IsBoolean, IsString, IsDateString, IsEnum } from 'class-validator'

export enum AccessLevel {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin',
}

export class CreateShareLinkDto {
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean

  @IsOptional()
  @IsDateString()
  expiresAt?: string

  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel
}

export class ShareWithUserDto {
  @IsString()
  userId: string

  @IsEnum(AccessLevel)
  accessLevel: AccessLevel
} 