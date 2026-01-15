import { IsString } from 'class-validator'

export class AddUserToDepartmentDto {
  @IsString()
  departmentId: string

  @IsString()
  userId: string
}
