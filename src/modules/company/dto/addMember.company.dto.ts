import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateCompanyUserDto {
  @IsNotEmpty({ message: 'firstName is required' })
  @IsString()
  firstName: string

  @IsNotEmpty({ message: 'lastName is required' })
  @IsString()
  lastName: string

  @IsNotEmpty({ message: 'email is required' })
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  job?: string

  @IsOptional()
  @IsString()
  department?: string

  @IsOptional()
  @IsString()
  icon?: string
}
