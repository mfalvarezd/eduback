import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { OpenaiService } from './openai.service'

class GenerateCourseContentDto {
  courseDescription: string
  courseDetails?: string
  userDuration?: string
  userModality?: string
  userLevel?: string
  positions?: string[]
  areas?: string[]
}

class AnalyzeRequirementsDto {
  requirements: string
}

class GenerateQuotationSummaryDto {
  courseName?: string
  numberOfPeople?: number
  duration?: string
  modality?: string
  location?: string
}

@Controller('openai')
@UseGuards(AuthGuard('jwt'))
export class OpenaiController {
  constructor(private readonly openaiService: OpenaiService) {}

  @Post('generate-course-content')
  async generateCourseContent(
    @Body() dto: GenerateCourseContentDto,
    @Request() req,
  ) {
    try {
      const content = await this.openaiService.generateCourseContent(
        dto.courseDescription,
        dto.userDuration,
        dto.userModality,
        dto.userLevel,
        dto.courseDetails,
        dto.positions,
        dto.areas,
      )

      return {
        success: true,
        data: content,
        message: 'Contenido del curso generado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al generar contenido del curso',
      }
    }
  }

  @Post('analyze-requirements')
  async analyzeRequirements(
    @Body() dto: AnalyzeRequirementsDto,
    @Request() req,
  ) {
    try {
      const analysis = await this.openaiService.analyzeCourseRequirements(
        dto.requirements,
      )

      return {
        success: true,
        data: analysis,
        message: 'Análisis de requerimientos completado',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al analizar requerimientos',
      }
    }
  }

  @Post('generate-quotation-summary')
  async generateQuotationSummary(
    @Body() dto: GenerateQuotationSummaryDto,
    @Request() req,
  ) {
    try {
      const summary = await this.openaiService.generateQuotationSummary(dto)

      return {
        success: true,
        data: { summary },
        message: 'Resumen de cotización generado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al generar resumen de cotización',
      }
    }
  }

  @Post('test-connection')
  async testConnection() {
    try {
      // Probar la conexión con OpenAI
      const testResponse = await this.openaiService.testOpenAIConnection()
      return {
        success: true,
        message: 'Conexión con OpenAI exitosa',
        data: testResponse,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con OpenAI',
        error: error.message,
      }
    }
  }

  @Post('test-image-generation')
  async testImageGeneration(
    @Body() dto: { courseName: string; courseDescription: string },
  ) {
    try {
      const imageUrl = await this.openaiService.generateCourseImage(
        dto.courseName,
        dto.courseDescription,
      )

      return {
        success: true,
        message: 'Imagen generada exitosamente',
        data: {
          imageUrl: imageUrl,
          courseName: dto.courseName,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Error al generar imagen',
        error: error.message,
      }
    }
  }
}
