import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator'

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPassword implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    return PASSWORD_REGEX.test(password)
  }

  defaultMessage(args: ValidationArguments) {
    return 'La contraseña debe tener al menos una mayúscula, una minúscula, un número, un carácter especial y mínimo 12 caracteres'
  }
}
