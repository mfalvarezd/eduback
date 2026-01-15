import { Injectable, Logger } from '@nestjs/common'
import { OpenaiService } from '../openai/openai.service'
import { CreateQuotationDto } from './dto/create-quotation.dto'
import { PrismaService } from '../../../prisma/prisma.service'
import * as PDFDocument from 'pdfkit'
import * as fs from 'fs'
import * as path from 'path'

export interface QuotationResult {
  id: string
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

@Injectable()
export class QuoterService {
  private readonly logger = new Logger(QuoterService.name)

  constructor(
    private readonly openaiService: OpenaiService,
    private readonly prisma: PrismaService,
  ) {}

  async createQuotation(
    dto: CreateQuotationDto,
    userId: string,
  ): Promise<QuotationResult> {
    try {
      this.logger.log(`Creando cotización para usuario: ${userId}`)

      // Generar contenido del curso usando OpenAI
      const courseContent = await this.openaiService.generateCourseContent(
        dto.courseSearch,
        dto.courseDuration,
        dto.courseModality,
        dto.courseLevel,
        dto.courseDetails,
        dto.positions,
        dto.areas,
      )

      // Generar imagen del curso
      this.logger.log('Iniciando generación de imagen del curso...')
      this.logger.log('Parámetros para imagen:', {
        courseName: courseContent.courseName || dto.courseSearch,
        courseDescription: dto.courseSearch,
      })

      const courseImage = await this.openaiService.generateCourseImage(
        courseContent.courseName || dto.courseSearch,
        dto.courseSearch,
      )

      this.logger.log('Imagen del curso generada:', courseImage ? 'Sí' : 'No')
      if (courseImage) {
        this.logger.log('URL de imagen del curso:', courseImage)
        this.logger.log('Tipo de imagen:', typeof courseImage)
        this.logger.log('Longitud de URL:', courseImage.length)
      } else {
        this.logger.warn('No se pudo generar imagen del curso')
      }

      // Generar resumen de la cotización
      const summary = await this.openaiService.generateQuotationSummary({
        courseName: courseContent.courseName || dto.courseSearch,
        numberOfPeople: dto.numberOfPeople,
        duration: courseContent.duration || dto.courseDuration,
        modality: courseContent.modality || dto.courseModality,
        location: dto.address
          ? `${dto.city}, ${dto.state}, ${dto.country}`
          : 'No especificada',
        priceUSD: courseContent.priceUSD || 0,
      })

      // Construir el resultado
      const quotation: QuotationResult = {
        id: this.generateQuotationId(),
        courseName: courseContent.courseName || dto.courseSearch,
        objectives: {
          general: courseContent.objectives?.general || [],
          specific: courseContent.objectives?.specific || [],
        },
        content: courseContent.content || [],
        duration: courseContent.duration || dto.courseDuration,
        durationDays: courseContent.durationDays || 'No especificado',
        durationHours: parseInt(
          courseContent.duration?.replace('horas', '') || '0',
        ),
        modality: courseContent.modality || dto.courseModality,
        level: dto.courseLevel,
        participants: courseContent.participants || dto.numberOfPeople,
        priceUSD: courseContent.priceUSD || 0,
        youWillLearn: courseContent.youWillLearn || [],
        prerequisites: courseContent.prerequisites || 'No especificado',
        targetAudience: courseContent.targetAudience || 'No especificado',
        courseMaterials: courseContent.courseMaterials || [],
        tentativeDate: dto.tentativeDate,
        summary,
        courseImage: courseImage || undefined, // Agregar la imagen del curso
        createdAt: new Date(),
      }

      // Agregar ubicación si está disponible
      if (
        dto.facilities === 'have_facilities' &&
        dto.country &&
        dto.state &&
        dto.city
      ) {
        quotation.location = {
          country: dto.country,
          state: dto.state,
          city: dto.city,
          address: dto.address || '',
        }
      }

      this.logger.log(`Cotización creada exitosamente: ${quotation.id}`)
      this.logger.log(
        `Imagen incluida en cotización: ${quotation.courseImage ? 'Sí' : 'No'}`,
      )
      if (quotation.courseImage) {
        this.logger.log(`URL de imagen en cotización: ${quotation.courseImage}`)
      }
      return quotation
    } catch (error) {
      this.logger.error('Error al crear cotización:', error)
      throw new Error(`Error al crear cotización: ${error.message}`)
    }
  }

  async analyzeQuotationRequirements(requirements: string): Promise<any> {
    try {
      this.logger.log('Analizando requerimientos de cotización')

      const analysis =
        await this.openaiService.analyzeCourseRequirements(requirements)

      return {
        ...analysis,
        timestamp: new Date(),
      }
    } catch (error) {
      this.logger.error('Error al analizar requerimientos:', error)
      throw new Error(`Error al analizar requerimientos: ${error.message}`)
    }
  }

  async generateQuotationLink(quotationId: string): Promise<string> {
    // Generar un enlace único para la cotización
    const baseUrl = process.env.FRONTEND_URL || 'https://apps.solinal.org'
    return `${baseUrl}/cotizacion/${quotationId}`
  }

  private generateQuotationId(): string {
    // Generar un ID único para la cotización
    const timestamp = Date.now().toString(36)
    const randomStr = Math.random().toString(36).substring(2, 8)
    return `quote_${timestamp}_${randomStr}`
  }

  // Método para obtener estadísticas de cotizaciones
  async getQuotationStats(userId: string): Promise<any> {
    // Aquí podrías implementar lógica para obtener estadísticas
    // Por ahora retornamos datos de ejemplo
    return {
      totalQuotations: 0,
      thisMonth: 0,
      averageParticipants: 0,
      mostRequestedCourses: [],
    }
  }

  // Método para validar si una cotización es válida
  validateQuotation(dto: CreateQuotationDto): boolean {
    // Validaciones adicionales si es necesario
    if (dto.facilities === 'have_facilities') {
      return !!(dto.country && dto.state && dto.city && dto.address)
    }
    return true
  }
}
