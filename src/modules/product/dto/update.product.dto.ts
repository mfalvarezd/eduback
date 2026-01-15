import { IsOptional, IsString } from 'class-validator'

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  readonly product?: string
}
