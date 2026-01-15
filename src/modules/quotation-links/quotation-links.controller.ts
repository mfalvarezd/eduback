import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  Request,
  Param,
  ValidationPipe,
  HttpStatus,
  HttpException,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { QuotationLinksService } from './quotation-links.service'
import {
  CreateShareLinkDto,
  ShareWithUserDto,
} from './dto/create-share-link.dto'
import { SaveQuotationAndGenerateDto } from './dto/save-quotation-and-generate.dto'
import { PdfService } from '../pdf/pdf.service'

@Controller('quotation-links')
export class QuotationLinksController {
  constructor(
    private readonly quotationLinksService: QuotationLinksService,
    private readonly pdfService: PdfService,
  ) {}

  @Post('save-and-generate')
  @UseGuards(AuthGuard('jwt'))
  async saveQuotationAndGenerateLink(
    @Body(new ValidationPipe()) dto: SaveQuotationAndGenerateDto,
    @Request() req,
  ) {
    try {
      // Extraer los datos de la cotización y las opciones
      const { quotationData, courseImage, isPublic, expiresAt, accessLevel } =
        dto

      const options: CreateShareLinkDto = {
        isPublic,
        expiresAt,
        accessLevel,
      }

      const result =
        await this.quotationLinksService.saveQuotationAndGenerateLink(
          { ...quotationData, courseImage },
          req.user.id,
          options,
        )

      return {
        success: true,
        data: result.data,
        message: 'Cotización guardada y enlace generado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al guardar cotización y generar enlace',
      }
    }
  }

  @Post('find-existing')
  @UseGuards(AuthGuard('jwt'))
  async findExistingQuotation(
    @Body(new ValidationPipe()) dto: SaveQuotationAndGenerateDto,
    @Request() req,
  ) {
    try {
      const { quotationData, courseImage } = dto

      const result = await this.quotationLinksService.findExistingQuotation(
        { ...quotationData, courseImage },
        req.user.id,
      )

      return {
        success: true,
        data: result,
        message: result
          ? 'Cotización existente encontrada'
          : 'No se encontró cotización existente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error buscando cotización existente',
      }
    }
  }

  @Post('generate/:quotationId')
  @UseGuards(AuthGuard('jwt'))
  async generateQuotationLink(
    @Param('quotationId') quotationId: string,
    @Body(new ValidationPipe()) dto: CreateShareLinkDto,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.generateQuotationLink(
        quotationId,
        req.user.id,
        dto,
      )

      return {
        success: true,
        data: result.data,
        message: 'Link de cotización generado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al generar link de cotización',
      }
    }
  }

  // Endpoint público para acceder a cotizaciones compartidas sin autenticación
  @Get('public/:token')
  async getPublicQuotationByToken(@Param('token') token: string) {
    try {
      const result = await this.quotationLinksService.getQuotationByToken(token)

      // Debug: Log de la imagen
      console.log('=== DEBUG PUBLIC ENDPOINT ===')
      console.log('Token:', token)
      console.log('Quotation ID:', result.data.id)
      console.log('Course Image:', result.data.courseImage)
      console.log(
        'Quotation Data:',
        JSON.stringify(result.data.quotationData, null, 2),
      )

      return {
        success: true,
        data: result.data,
        message: 'Cotización obtenida exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotización',
      }
    }
  }

  // Endpoint de proxy para imágenes (evita problemas de CORS)
  @Get('image/:token')
  async proxyImage(@Param('token') token: string, @Res() res: Response) {
    try {
      const result = await this.quotationLinksService.getQuotationByToken(token)
      const quotation = result.data

      if (!quotation.courseImage) {
        return res.status(404).json({
          success: false,
          message: 'No hay imagen en esta cotización',
        })
      }

      // Descargar la imagen y servirla desde nuestro servidor
      const axios = require('axios')
      try {
        const response = await axios.get(quotation.courseImage, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        // Configurar headers para la imagen
        res.set({
          'Content-Type': response.headers['content-type'] || 'image/png',
          'Content-Length': response.data.length,
          'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        })

        // Enviar la imagen
        res.send(response.data)
      } catch (imageError) {
        console.error('Error descargando imagen:', imageError)
        return res.status(500).json({
          success: false,
          error: imageError.message,
          message: 'Error al cargar la imagen',
        })
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al obtener cotización',
      })
    }
  }

  // Endpoint de prueba para verificar imágenes
  @Get('test-image/:token')
  async testImageAccess(@Param('token') token: string) {
    try {
      const result = await this.quotationLinksService.getQuotationByToken(token)
      const quotation = result.data

      if (!quotation.courseImage) {
        return {
          success: false,
          message: 'No hay imagen en esta cotización',
        }
      }

      // Intentar hacer una petición HEAD a la imagen para verificar si es accesible
      const axios = require('axios')
      try {
        const response = await axios.head(quotation.courseImage, {
          timeout: 5000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        })

        return {
          success: true,
          imageUrl: quotation.courseImage,
          statusCode: response.status,
          headers: response.headers,
        }
      } catch (imageError) {
        return {
          success: false,
          imageUrl: quotation.courseImage,
          error: imageError.message,
          message: 'La imagen no es accesible',
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al verificar imagen',
      }
    }
  }

  // Endpoint público para servir directamente el PDF de la cotización
  @Get('pdf/:token')
  async getPublicQuotationPDF(
    @Param('token') token: string,
    @Res() res: Response,
    @Request() req,
  ) {
    // Verificar si se solicita versión sin imagen
    const query = req.query
    const skipImage = query.skipImage === 'true'
    try {
      // Obtener la cotización por token
      const result = await this.quotationLinksService.getQuotationByToken(token)
      const quotation = result.data

      console.log('=== DEBUG PDF ENDPOINT ===')
      console.log('Token recibido:', token)
      console.log('Quotation completa:', JSON.stringify(quotation, null, 2))
      console.log(
        'quotationData:',
        JSON.stringify(quotation.quotationData, null, 2),
      )
      console.log('courseImage:', quotation.courseImage)
      console.log('createdAt:', quotation.createdAt)

      // Preparar datos para el PDF usando los datos procesados guardados
      console.log('=== DEBUG PDF ENDPOINT - DATOS DE LA BD ===')
      console.log('Token recibido:', token)
      console.log('Quotation ID:', quotation.id)
      console.log('User ID:', quotation.userId)
      console.log('Share Token:', quotation.shareToken)
      console.log('Is Public:', quotation.isPublic)
      console.log('Expires At:', quotation.expiresAt)
      console.log('Created At:', quotation.createdAt)
      console.log('Updated At:', quotation.updatedAt)

      console.log('=== QUOTATION DATA COMPLETO ===')
      console.log(
        'quotationData (JSON):',
        JSON.stringify(quotation.quotationData, null, 2),
      )

      console.log('=== CAMPOS ESPECÍFICOS ===')
      console.log('courseName:', quotation.quotationData?.courseName)
      console.log('duration:', quotation.quotationData?.duration)
      console.log('durationDays:', quotation.quotationData?.durationDays)
      console.log('durationHours:', quotation.quotationData?.durationHours)
      console.log('modality:', quotation.quotationData?.modality)
      console.log('level:', quotation.quotationData?.level)
      console.log('participants:', quotation.quotationData?.participants)
      console.log('priceUSD:', quotation.quotationData?.priceUSD)
      console.log('objectives:', quotation.quotationData?.objectives)
      console.log('youWillLearn:', quotation.quotationData?.youWillLearn)
      console.log('prerequisites:', quotation.quotationData?.prerequisites)
      console.log('targetAudience:', quotation.quotationData?.targetAudience)
      console.log('content:', quotation.quotationData?.content)
      console.log('courseMaterials:', quotation.quotationData?.courseMaterials)
      console.log(
        'courseImage (en JSON):',
        quotation.quotationData?.courseImage,
      )

      console.log('=== CAMPOS DE LA TABLA ===')
      console.log('courseImage (campo de tabla):', quotation.courseImage)
      console.log('createdAt (campo de tabla):', quotation.createdAt)

      // Los datos en quotation.quotationData ahora incluyen tanto los originales como los procesados
      // Usar directamente estos datos para el PDF
      const pdfData = {
        courseName: quotation.quotationData.courseName || 'Curso de Formación',
        duration: quotation.quotationData.duration || '8 horas',
        durationDays: quotation.quotationData.durationDays || '1 día',
        durationHours: quotation.quotationData.durationHours || 8,
        modality: quotation.quotationData.modality || 'Presencial',
        level: quotation.quotationData.level || 'Básico',
        participants: quotation.quotationData.participants || 10,
        priceUSD: quotation.quotationData.priceUSD || 0,
        location: quotation.quotationData.address || 'Por definir',
        objectives: quotation.quotationData.objectives || {
          general: [
            'Proporcionar conocimientos fundamentales en el área especificada',
          ],
          specific: [
            'Desarrollar competencias prácticas',
            'Aplicar mejores prácticas',
          ],
        },
        youWillLearn: quotation.quotationData.youWillLearn || [
          'Fundamentos teóricos',
          'Aplicaciones prácticas',
          'Mejores prácticas del sector',
        ],
        prerequisites:
          quotation.quotationData.prerequisites ||
          'No se requieren conocimientos previos',
        targetAudience:
          quotation.quotationData.targetAudience ||
          'Personal técnico y operativo',
        courseContent: quotation.quotationData.content || [
          {
            tema: 'Introducción y fundamentos',
            duracionHoras: 2,
            subtemas: ['Conceptos básicos', 'Marco normativo'],
          },
          {
            tema: 'Aplicaciones prácticas',
            duracionHoras: 4,
            subtemas: ['Casos de estudio', 'Ejercicios prácticos'],
          },
          {
            tema: 'Evaluación y cierre',
            duracionHoras: 2,
            subtemas: ['Evaluación de conocimientos', 'Certificación'],
          },
        ],
        courseMaterials: quotation.quotationData.courseMaterials || [
          'Material didáctico impreso',
          'Presentaciones digitales',
          'Certificado de participación',
        ],
        createdAt: quotation.quotationData.createdAt || quotation.createdAt,
        aiGeneratedImage: skipImage
          ? undefined
          : quotation.quotationData.courseImage || quotation.courseImage, // Omitir imagen si se solicita
      }

      console.log('=== DATOS PREPARADOS PARA PDF ===')
      console.log('pdfData completo:', JSON.stringify(pdfData, null, 2))
      console.log('courseName final:', pdfData.courseName)
      console.log('objectives final:', pdfData.objectives)
      console.log('content final:', pdfData.courseContent)
      console.log('youWillLearn final:', pdfData.youWillLearn)
      console.log('prerequisites final:', pdfData.prerequisites)
      console.log('targetAudience final:', pdfData.targetAudience)
      console.log('aiGeneratedImage final:', pdfData.aiGeneratedImage)
      console.log('priceUSD final:', pdfData.priceUSD)
      console.log('duration final:', pdfData.duration)
      console.log('modality final:', pdfData.modality)

      // Generar el PDF
      const pdfBuffer = await this.pdfService.generateQuotationPDF(pdfData)

      // Configurar headers para mostrar el PDF en el navegador
      console.log('Generando nombre de archivo...')
      console.log('courseSearch:', quotation.quotationData?.courseSearch)
      console.log('courseName:', quotation.quotationData?.courseName)

      let courseName = 'cotizacion'
      if (quotation.quotationData?.courseSearch) {
        courseName = quotation.quotationData.courseSearch
      } else if (quotation.quotationData?.courseName) {
        courseName = quotation.quotationData.courseName
      }

      const safeFilename = courseName
        .replace(/[^a-zA-Z0-9]/g, '-')
        .substring(0, 50)
      const filename = `cotizacion-${safeFilename}.pdf`

      console.log('Nombre de archivo generado:', filename)

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      })

      // Enviar el PDF
      res.send(pdfBuffer)
    } catch (error) {
      console.error('Error generando PDF público:', error)
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Error al generar PDF de la cotización',
      })
    }
  }

  @Get('shared/:token')
  @UseGuards(AuthGuard('jwt'))
  async getQuotationByToken(@Param('token') token: string) {
    try {
      const result = await this.quotationLinksService.getQuotationByToken(token)

      return {
        success: true,
        data: result.data,
        message: 'Cotización obtenida exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotización',
      }
    }
  }

  @Get('access/:quotationId')
  @UseGuards(AuthGuard('jwt'))
  async checkQuotationAccess(
    @Param('quotationId') quotationId: string,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.checkQuotationAccess(
        quotationId,
        req.user.id,
      )

      return {
        success: true,
        data: result,
        message: 'Verificación de acceso completada',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al verificar acceso',
      }
    }
  }

  @Post('share/:quotationId')
  @UseGuards(AuthGuard('jwt'))
  async shareWithUser(
    @Param('quotationId') quotationId: string,
    @Body(new ValidationPipe()) dto: ShareWithUserDto,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.shareWithUser(
        quotationId,
        req.user.id,
        dto,
      )

      return {
        success: true,
        data: result.data,
        message: 'Cotización compartida exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al compartir cotización',
      }
    }
  }

  @Delete('revoke/:quotationId/:userId')
  @UseGuards(AuthGuard('jwt'))
  async revokeAccess(
    @Param('quotationId') quotationId: string,
    @Param('userId') targetUserId: string,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.revokeAccess(
        quotationId,
        req.user.id,
        targetUserId,
      )

      return {
        success: true,
        data: result,
        message: 'Acceso revocado exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al revocar acceso',
      }
    }
  }

  @Get('shared-with-me')
  @UseGuards(AuthGuard('jwt'))
  async getSharedQuotations(@Request() req) {
    try {
      const result = await this.quotationLinksService.getSharedQuotations(
        req.user.id,
      )

      return {
        success: true,
        data: result.data,
        message: 'Cotizaciones compartidas obtenidas exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotizaciones compartidas',
      }
    }
  }

  @Get('my-quotations')
  @UseGuards(AuthGuard('jwt'))
  async getUserQuotations(@Request() req) {
    try {
      const result = await this.quotationLinksService.getUserQuotations(
        req.user.id,
      )

      return {
        success: true,
        data: result.data,
        message: 'Cotizaciones obtenidas exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al obtener cotizaciones',
      }
    }
  }

  @Get('existing-link/:quotationId')
  @UseGuards(AuthGuard('jwt'))
  async getExistingLink(
    @Param('quotationId') quotationId: string,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.getExistingLink(
        quotationId,
        req.user.id,
      )

      return {
        success: true,
        data: result,
        message: result
          ? 'Link existente encontrado'
          : 'No se encontró link existente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error obteniendo link existente',
      }
    }
  }

  @Delete('delete/:quotationId')
  @UseGuards(AuthGuard('jwt'))
  async deleteQuotation(
    @Param('quotationId') quotationId: string,
    @Request() req,
  ) {
    try {
      const result = await this.quotationLinksService.deleteQuotation(
        quotationId,
        req.user.id,
      )

      return {
        success: true,
        data: result,
        message: 'Cotización eliminada exitosamente',
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Error al eliminar cotización',
      }
    }
  }
}
