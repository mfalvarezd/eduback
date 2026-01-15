import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator'

export enum CourseLevel {
  BEGINNER = 'beginner',
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseDuration {
  FOUR_HOURS = '4h',
  SIX_HOURS = '6h',
  EIGHT_HOURS = '8h',
  TWELVE_HOURS = '12h',
  SIXTEEN_HOURS = '16h',
  TWENTY_HOURS = '20h',
  TWENTY_FOUR_HOURS = '24h',
  RECOMMENDED = 'recommended',
}

export enum CourseModality {
  PRESENTIAL = 'presential',
  LIVE = 'live',
  HYBRID = 'hybrid',
}

export enum FacilitiesType {
  HAVE_FACILITIES = 'have_facilities',
  NO_FACILITIES = 'no_facilities',
}

export class CreateQuotationDto {
  @IsString()
  @MaxLength(300)
  courseSearch: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  courseDetails?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  positions?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  areas?: string[]

  @IsOptional()
  @IsString()
  otherArea?: string

  @IsEnum(CourseLevel)
  courseLevel: CourseLevel

  @IsEnum(CourseDuration)
  courseDuration: CourseDuration

  @IsEnum(CourseModality)
  courseModality: CourseModality

  @IsNumber()
  @Min(4)
  numberOfPeople: number

  @IsEnum(FacilitiesType)
  facilities: FacilitiesType

  @IsOptional()
  @IsString()
  country?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  city?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  tentativeDate?: Date
}
