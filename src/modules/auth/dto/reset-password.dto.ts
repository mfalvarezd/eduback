import { IsJWT, IsString, MinLength, Matches } from 'class-validator'

export class ResetPasswordDto {
  @IsJWT({ message: 'resetToken is required to be JWT valid' })
  resetToken: string

  @IsString({ message: 'newPassword must be a string' })
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' })
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{12,}$/,
    {
      message:
        'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un carácter especial',
    },
  )
  newPassword: string
}
