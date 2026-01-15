import { IsString, IsNotEmpty } from 'class-validator'

export class AddUserToDepartmentDto {
  @IsString()
  @IsNotEmpty()
  departmentId: string

  @IsString()
  @IsNotEmpty()
  userId: string
}
