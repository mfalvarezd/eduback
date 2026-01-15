import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Param,
  ValidationPipe,
  HttpStatus,
  HttpException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { QuoterService } from './quoter.service'
import { CreateQuotationDto } from './dto/create-quotation.dto'

class AnalyzeRequirementsDto {
  requirements: string
}

@Controller('quoter')
@UseGuards(AuthGuard('jwt'))
export class QuoterController {
  constructor(private readonly quoterService: QuoterService) {}

  @Post('create-quotation')
  async createQuotation(
    @Body(new ValidationPipe()) dto: CreateQuotationDto,
    @Request() req,
  ) {
    try {
      // Validar la cotización
      if (!this.quoterService.validateQuotation(dto)) {
        throw new HttpException(
          'Datos de ubicación incompletos para cotización con instalaciones',
          HttpStatus.BAD_REQUEST,
        )
      }

      const quotation = await this.quoterService.createQuotation(
        dto,
        req.user.id,
      )

      return {
        success: true,
        data: quotation,
        message: 'Cotización creada exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al crear cotización',
      }
    }
  }

  @Post('analyze-requirements')
  async analyzeRequirements(
    @Body() dto: AnalyzeRequirementsDto,
    @Request() req,
  ) {
    try {
      const analysis = await this.quoterService.analyzeQuotationRequirements(
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

  @Get('generate-link/:quotationId')
  async generateQuotationLink(
    @Param('quotationId') quotationId: string,
    @Request() req,
  ) {
    try {
      const link = await this.quoterService.generateQuotationLink(quotationId)

      return {
        success: true,
        data: { link },
        message: 'Enlace de cotización generado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al generar enlace de cotización',
      }
    }
  }

  @Get('stats')
  async getQuotationStats(@Request() req) {
    try {
      const stats = await this.quoterService.getQuotationStats(req.user.id)

      return {
        success: true,
        data: stats,
        message: 'Estadísticas obtenidas exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener estadísticas',
      }
    }
  }

  @Get('quotation/:quotationId')
  async getQuotation(
    @Param('quotationId') quotationId: string,
    @Request() req,
  ) {
    try {
      // Aquí podrías implementar la lógica para obtener una cotización específica
      // Por ahora retornamos un error de no implementado
      throw new HttpException(
        'Endpoint no implementado',
        HttpStatus.NOT_IMPLEMENTED,
      )
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotización',
      }
    }
  }
}
