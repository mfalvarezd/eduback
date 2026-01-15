import { IsString, IsNotEmpty } from 'class-validator'

export class CreateDeviceHistoryDto {
  @IsNotEmpty({ message: 'WebBrowser is required' })
  @IsString()
  webBrowser: string

  @IsNotEmpty({ message: 'Device is required' })
  @IsString()
  device: string

  @IsNotEmpty({ message: 'DeviceId is required' })
  @IsString()
  deviceId: string

  @IsNotEmpty({ message: 'Address is required' })
  @IsString()
  address: string
}
