import { IsString, IsNotEmpty, IsOptional } from 'class-validator'

export class CreateNotificationDto {
  @IsNotEmpty({ message: 'RecieverId is required' })
  @IsString()
  recieverId: string

  @IsNotEmpty({ message: 'Header is required' })
  @IsString()
  header: string

  @IsNotEmpty({ message: 'Content is required' })
  @IsString()
  content: string

  @IsNotEmpty({ message: 'Type is required' })
  @IsString()
  type: string

  @IsOptional()
  extraData?: Record<string, any>
}
