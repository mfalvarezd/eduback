import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class RegisterGroupUserDto {
  @IsNotEmpty({ message: 'Group ID is required' })
  @IsString()
  groupId: string

  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  userId: string
}
