import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  IsDate,
} from 'class-validator'
import { Type } from 'class-transformer'
import { IsStrongPassword } from '../custom_validators/strong-password.validator'

export class RegisterDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(12, { message: 'Password must be at least 12 characters long' })
  @Validate(IsStrongPassword, {
    message:
      'Password must include uppercase, lowercase, numbers and special characters',
  })
  password: string

  @IsNotEmpty({ message: 'First name is required' })
  @IsString({ message: 'First name must be a string' })
  firstName: string

  @IsNotEmpty({ message: 'Last name is required' })
  @IsString({ message: 'Last name must be a string' })
  lastName: string

  @IsNotEmpty({ message: 'Cellphone is required' })
  @IsString({ message: 'Cellphone must be a string' })
  cellphone: string

  @IsNotEmpty({ message: 'Country is required' })
  @IsString({ message: 'Country must be a string' })
  country: string

  @IsOptional()
  @IsString({ message: 'City must be a string' })
  city?: string

  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  userName?: string

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Birthday must be a valid date' })
  birthday?: Date

  @IsOptional()
  @IsString({ message: 'Role must be a string' })
  role?: string

  @IsOptional()
  @IsString({ message: 'Job must be a string' })
  job?: string

  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  department?: string

  @IsOptional()
  @IsString({ message: 'Type must be a string' })
  type?: string

  @IsOptional()
  @IsString({ message: 'Company name must be a string' })
  companyName?: string

  @IsOptional()
  @IsString({ message: 'Company size must be a string' })
  companySize?: string

  @IsOptional()
  @IsString({ message: 'Matrix direction must be a string' })
  matrixDirection?: string

  @IsOptional()
  @IsString({ message: 'Tax ID must be a string' })
  taxId?: string
}
