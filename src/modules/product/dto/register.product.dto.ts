import { IsNotEmpty, IsString } from 'class-validator'

export class RegisterProductDto {
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  readonly userId: string

  @IsNotEmpty({ message: 'Product name is required' })
  @IsString()
  readonly product: string
}
