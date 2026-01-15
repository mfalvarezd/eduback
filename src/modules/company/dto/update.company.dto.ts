import { IsOptional, IsString } from 'class-validator'

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  readonly name?: string

  @IsOptional()
  @IsString()
  readonly companyName?: string

  @IsOptional()
  @IsString()
  readonly matrixDirection?: string

  @IsOptional()
  @IsString()
  readonly taxId?: string

  @IsOptional()
  @IsString()
  readonly size?: string

  @IsOptional()
  @IsString()
  readonly country?: string

  @IsOptional()
  @IsString()
  readonly city?: string
}
