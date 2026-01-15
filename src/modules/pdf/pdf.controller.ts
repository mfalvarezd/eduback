import {
  Controller,
  Post,
  Body,
  Res,
  Logger,
  HttpException,
  HttpStatus,
  Get,
  Options,
} from '@nestjs/common'
import { Response } from 'express'
import { PdfService, QuotationPDFData } from './pdf.service'

@Controller('pdf')
export class PdfController {
  private readonly logger = new Logger(PdfController.name)

  constructor(private readonly pdfService: PdfService) {}

  @Get('health')
  async healthCheck(@Res() res: Response) {
    try {
      this.logger.log('Health check solicitado')

      res.status(200).json({
        status: 'ok',
        service: 'pdf-service',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
      })
    } catch (error) {
      this.logger.error('Error en health check:', error)
      res.status(500).json({
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      })
    }
  }

  @Options('generate-quotation')
  async generateQuotationOptions(@Res() res: Response) {
    const origin = res.req.headers.origin || 'https://dashboard-frontend-9dpx.onrender.com'
    
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '3600',
    })
    res.status(200).send()
  }

  @Post('generate-quotation')
  async generateQuotationPDF(
    @Body() quotationData: QuotationPDFData,
    @Res() res: Response,
  ) {
    try {
      this.logger.log('=== INICIO GENERACIÓN PDF ===')
      this.logger.log('Generando PDF de cotización...')
      this.logger.log(
        'Headers recibidos:',
        JSON.stringify(res.req.headers, null, 2),
      )
      this.logger.log('Origin del request:', res.req.headers.origin)
      this.logger.log('User-Agent:', res.req.headers['user-agent'])

      // Log de datos recibidos (sin información sensible)
      const logData = {
        courseName: quotationData.courseName,
        hasImage: !!quotationData.aiGeneratedImage,
        imageType: quotationData.aiGeneratedImage
          ? quotationData.aiGeneratedImage.startsWith('data:')
            ? 'base64'
            : 'URL'
          : 'none',
        dataSize: JSON.stringify(quotationData).length,
        timestamp: new Date().toISOString(),
      }
      this.logger.log('Datos recibidos:', JSON.stringify(logData, null, 2))

      // Validar datos requeridos
      if (!quotationData.courseName) {
        this.logger.error('Error: Nombre del curso no proporcionado')
        return res.status(400).json({
          error: 'Datos incompletos',
          message: 'El nombre del curso es requerido',
          timestamp: new Date().toISOString(),
        })
      }

      // Validar tamaño de datos
      const dataSize = JSON.stringify(quotationData).length
      if (dataSize > 10 * 1024 * 1024) {
        // 10MB
        this.logger.error(`Error: Datos demasiado grandes (${dataSize} bytes)`)
        return res.status(413).json({
          error: 'Datos demasiado grandes',
          message: 'El tamaño de los datos excede el límite permitido',
          timestamp: new Date().toISOString(),
        })
      }

      this.logger.log('Iniciando generación de PDF con servicio...')
      const pdfBuffer =
        await this.pdfService.generateQuotationPDF(quotationData)

      this.logger.log('PDF generado exitosamente, tamaño:', pdfBuffer.length)

      // Configurar headers para descarga
      const filename = `cotizacion-${quotationData.courseName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      const origin = res.req.headers.origin || 'https://dashboard-frontend-9dpx.onrender.com'

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type, Authorization, Accept, Origin, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
      })

      // Enviar el PDF
      res.send(pdfBuffer)

      this.logger.log('PDF generado y enviado exitosamente')
      this.logger.log('=== FIN GENERACIÓN PDF ===')
    } catch (error) {
      this.logger.error('=== ERROR EN GENERACIÓN PDF ===')
      this.logger.error('Error generando PDF:', error)
      this.logger.error('Stack trace:', error.stack)
      this.logger.error('Error name:', error.name)
      this.logger.error('Error message:', error.message)

      // Determinar el tipo de error y responder apropiadamente
      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
      let errorMessage = 'Error interno del servidor'

      if (error.name === 'ValidationError') {
        statusCode = HttpStatus.BAD_REQUEST
        errorMessage = 'Datos de entrada inválidos'
      } else if (error.message.includes('timeout')) {
        statusCode = HttpStatus.REQUEST_TIMEOUT
        errorMessage = 'Tiempo de espera agotado'
      } else if (
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED')
      ) {
        statusCode = HttpStatus.SERVICE_UNAVAILABLE
        errorMessage = 'Servicio temporalmente no disponible'
      }

      res.status(statusCode).json({
        error: 'Error generando PDF',
        message: errorMessage,
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      })
    }
  }

  @Options('generate-quotation-base64')
  async generateQuotationBase64Options(@Res() res: Response) {
    const origin = res.req.headers.origin || 'https://dashboard-frontend-9dpx.onrender.com'
    
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, Accept, Origin, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '3600',
    })
    res.status(200).send()
  }

  @Post('generate-quotation-base64')
  async generateQuotationPDFBase64(@Body() quotationData: QuotationPDFData) {
    try {
      this.logger.log('=== INICIO GENERACIÓN PDF BASE64 ===')
      this.logger.log('Generando PDF de cotización en base64...')

      // Validar datos requeridos
      if (!quotationData.courseName) {
        throw new HttpException(
          'El nombre del curso es requerido',
          HttpStatus.BAD_REQUEST,
        )
      }

      const pdfBuffer =
        await this.pdfService.generateQuotationPDF(quotationData)
      const base64PDF = pdfBuffer.toString('base64')

      this.logger.log('PDF generado en base64 exitosamente')
      this.logger.log('=== FIN GENERACIÓN PDF BASE64 ===')

      return {
        success: true,
        pdfBase64: base64PDF,
        filename: `cotizacion-${quotationData.courseName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      this.logger.error('=== ERROR EN GENERACIÓN PDF BASE64 ===')
      this.logger.error('Error generando PDF en base64:', error)
      this.logger.error('Stack trace:', error.stack)

      throw new HttpException(
        {
          error: 'Error generando PDF',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
