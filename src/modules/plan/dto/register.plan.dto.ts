import { IsNotEmpty, IsString, IsOptional, IsInt } from 'class-validator'

export class RegisterPlanDto {
  @IsNotEmpty({ message: 'Plan name is required' })
  @IsString()
  readonly name: string

  @IsNotEmpty({ message: 'Plan description is required' })
  @IsString()
  readonly description: string

  @IsOptional()
  @IsInt({ message: 'Number of users must be an integer' })
  readonly maxUsers?: number
}
