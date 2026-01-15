// src/auth/dto/send-verification-code.dto.ts
import { IsEmail, IsOptional, IsString, IsBoolean } from 'class-validator'

export class SendVerificationCodeDto {
  @IsEmail()
  email: string

  @IsString()
  name: string

  @IsString()
  reason: string

  @IsOptional()
  @IsString()
  customSubject?: string

  @IsOptional()
  @IsString()
  phoneNumber?: string

  @IsOptional()
  @IsBoolean()
  sendBySMS?: boolean
}
