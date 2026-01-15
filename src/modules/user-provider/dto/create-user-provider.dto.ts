import { IsString, IsNotEmpty } from 'class-validator'

export class CreateUserProviderDto {
  @IsString()
  @IsNotEmpty({ message: 'Provider is required' })
  provider: string

  @IsString()
  @IsNotEmpty({ message: 'Provider ID is required' })
  providerId: string
}
