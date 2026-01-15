import { IsString, IsNotEmpty } from 'class-validator'

export class CreateUserNetworkDto {
  @IsNotEmpty({ message: 'Network is required' })
  @IsString()
  network: string
}
