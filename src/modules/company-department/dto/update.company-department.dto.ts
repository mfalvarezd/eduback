import { IsOptional, IsString } from 'class-validator'

export class UpdateCompanyDepartmentDto {
  @IsOptional()
  @IsString()
  readonly name?: string

  @IsOptional()
  @IsString()
  readonly icon?: string
}
