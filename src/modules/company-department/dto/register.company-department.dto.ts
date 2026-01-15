import { IsNotEmpty, IsString } from 'class-validator'

export class RegisterCompanyDepartmentDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string

  @IsNotEmpty()
  @IsString()
  readonly icon: string
}
