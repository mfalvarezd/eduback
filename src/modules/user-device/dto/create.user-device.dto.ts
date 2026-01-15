import { IsString, IsNotEmpty } from 'class-validator'

export class CreateUserDeviceDto {
  @IsNotEmpty({ message: 'Device is required' })
  @IsString()
  device: string

  @IsNotEmpty({ message: 'DeviceId is required' })
  @IsString()
  deviceId: string
}
