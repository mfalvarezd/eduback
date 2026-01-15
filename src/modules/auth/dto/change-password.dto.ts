import { IsNotEmpty, IsString, MinLength, Validate } from 'class-validator'
import { IsStrongPassword } from '../custom_validators/strong-password.validator'

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  @Validate(IsStrongPassword, {
    message:
      'Password must include uppercase, lowercase, numbers and special characters',
  })
  password: string
}
