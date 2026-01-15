import {
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
  IsEnum,
  IsObject,
} from 'class-validator'
import { CreateShareLinkDto, AccessLevel } from './create-share-link.dto'

export class SaveQuotationAndGenerateDto extends CreateShareLinkDto {
  @IsObject()
  quotationData: {
    courseName: string
    objectives: {
      general: string[]
      specific: string[]
    }
    content: {
      tema: string
      duracionHoras: number
      subtemas: string[]
    }[]
    duration: string
    durationDays: string
    durationHours: number
    modality: string
    level: string
    participants: number
    priceUSD: number
    youWillLearn: string[]
    prerequisites: string
    targetAudience: string
    courseMaterials: string[]
    location?: {
      country: string
      state: string
      city: string
      address: string
    }
    tentativeDate?: Date
    summary: string
    courseImage?: string
    createdAt: Date
  }

  @IsOptional()
  @IsString()
  courseImage?: string
}
