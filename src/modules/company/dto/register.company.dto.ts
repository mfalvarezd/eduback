import { IsNotEmpty, IsOptional, isString, IsString } from 'class-validator'

export class RegisterCompanyDto {
  @IsNotEmpty({ message: 'userId is required' })
  @IsString()
  readonly userId: string

  @IsNotEmpty({ message: 'Company name is required' })
  @IsString()
  readonly name: string

  @IsOptional()
  @IsString()
  readonly companyName?: string

  @IsOptional()
  @IsString()
  readonly matrixDirection?: string

  @IsOptional()
  @IsString()
  readonly taxId?: string

  @IsNotEmpty({ message: 'Company size is required' })
  @IsString()
  readonly size: string

  @IsOptional()
  @IsString()
  readonly country?: string

  @IsOptional()
  @IsString()
  readonly city?: string
}
