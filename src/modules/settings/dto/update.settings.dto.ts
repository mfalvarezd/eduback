import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsString()
  dayFormat?: string

  @IsOptional()
  @IsString()
  timeFormat?: string

  @IsOptional()
  @IsString()
  timeZone?: string

  @IsOptional()
  @IsBoolean()
  changeTimeZone?: boolean

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  activitiesNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  summaryNotifications?: boolean

  @IsOptional()
  @IsBoolean()
  news?: boolean

  @IsOptional()
  @IsInt()
  bin?: number

  @IsOptional()
  @IsBoolean()
  proyectModification?: boolean

  @IsOptional()
  @IsBoolean()
  addMembers?: boolean

  @IsOptional()
  @IsBoolean()
  export?: boolean
}
