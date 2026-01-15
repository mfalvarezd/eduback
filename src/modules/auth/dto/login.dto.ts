import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Validate,
} from 'class-validator'

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Validate(IsStrongPassword)
  password: string
}
