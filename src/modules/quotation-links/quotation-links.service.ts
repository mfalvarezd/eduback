import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { PdfService } from '../pdf/pdf.service'
import { FirebasePdfService } from '../../utils/firabase-pdf/firabase-pdf.service'
import {
  CreateShareLinkDto,
  ShareWithUserDto,
  AccessLevel,
} from './dto/create-share-link.dto'
import { randomBytes } from 'crypto'

@Injectable()
export class QuotationLinksService {
  private readonly logger = new Logger(QuotationLinksService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly firebasePdfService: FirebasePdfService,
  ) {}

  /**
   * Guarda una cotización en la base de datos y genera un link
   */
  async saveQuotationAndGenerateLink(
    quotationData: any,
    userId: string,
    options: CreateShareLinkDto = {},
  ) {
    try {
      this.logger.log(
        `Guardando cotización y generando link para usuario: ${userId}`,
      )

      // Primero buscar si existe una cotización con los mismos datos
      this.logger.log(`Buscando cotización existente para usuario: ${userId}`)
      this.logger.log(
        `Datos de cotización recibidos: ${JSON.stringify(quotationData, null, 2)}`,
      )
      this.logger.log(`Tipo de datos: ${typeof quotationData}`)
      this.logger.log(
        `Propiedades disponibles: ${Object.keys(quotationData || {}).join(', ')}`,
      )

      const existingQuotation = await this.findExistingQuotation(
        quotationData,
        userId,
      )

      if (existingQuotation) {
        this.logger.log(
          `Cotización existente encontrada, reutilizando: ${existingQuotation.id}`,
        )

        // Verificar si ya existe un link para esta cotización
        const existingLink = await this.getExistingLink(
          existingQuotation.id,
          userId,
        )

        if (existingLink) {
          this.logger.log('Link existente encontrado, reutilizando...')
          return {
            success: true,
            data: existingLink,
          }
        }

        // Si no existe link, generar uno nuevo para la cotización existente
        this.logger.log('Generando nuevo link para cotización existente...')
        return await this.generateQuotationLink(
          existingQuotation.id,
          userId,
          options,
        )
      } else {
        this.logger.log('No se encontró cotización existente, creando nueva...')
      }

      // Si no existe, crear una nueva cotización
      this.logger.log('Creando nueva cotización...')

      // Guardar la cotización en la base de datos
      this.logger.log(
        `Guardando cotización con datos: ${JSON.stringify(quotationData, null, 2)}`,
      )

      const savedQuotation = await (this.prisma as any).quotation.create({
        data: {
          userId,
          quotationData: quotationData as any,
          courseImage: quotationData.courseImage || null,
        },
      })

      this.logger.log(`Cotización guardada exitosamente: ${savedQuotation.id}`)

      // Generar token único
      const shareToken = this.generateShareToken()

      // Actualizar la cotización con el token
      let updatedQuotation = await (this.prisma as any).quotation.update({
        where: { id: savedQuotation.id },
        data: {
          shareToken,
          isPublic: options.isPublic || false,
          expiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
        },
      })

      // Generar PDF y subir a Firebase Storage (ruta userId/quotationId/fileName)
      try {
        this.logger.log('Generando PDF para la nueva cotización...')
        const pdfData = {
          ...quotationData,
          createdAt:
            quotationData?.createdAt || savedQuotation.createdAt || new Date(),
          aiGeneratedImage:
            quotationData?.courseImage ||
            savedQuotation.courseImage ||
            undefined,
        }
        const pdfBuffer = await this.pdfService.generateQuotationPDF(
          pdfData as any,
        )

        const rawName =
          quotationData?.courseName ||
          quotationData?.courseSearch ||
          'cotizacion'
        const safeName = String(rawName)
          .replace(/[^a-zA-Z0-9]/g, '-')
          .substring(0, 50)
        const fileName = `cotizacion-${safeName}-${Date.now()}.pdf`

        const publicUrl = await this.firebasePdfService.uploadPdfBuffer(
          pdfBuffer,
          {
            userId,
            quotationId: savedQuotation.id,
            fileName,
          },
        )

        // Guardar URL y metadatos del PDF en la BD
        updatedQuotation = await (this.prisma as any).quotation.update({
          where: { id: savedQuotation.id },
          data: {
            pdfUrl: publicUrl,
            pdfFileName: fileName,
            pdfPath: `${userId}/${savedQuotation.id}/${fileName}`,
            pdfUploadedAt: new Date(),
          },
        })

        this.logger.log(`PDF subido y guardado: ${publicUrl}`)
      } catch (pdfError) {
        this.logger.error('Error generando/subiendo PDF:', pdfError)
        // Continuar: el link web funcionará, pero no habrá pdfUrl
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://apps.solinal.org'
      const shareUrl = `${baseUrl}/quotation/${shareToken}`
      const pdfUrl = `${baseUrl}/pdf/${shareToken}`

      this.logger.log(`Link generado exitosamente: ${shareUrl}`)
      this.logger.log(`PDF URL generado: ${pdfUrl}`)

      return {
        success: true,
        data: {
          // Preferir URL pública de Firebase si existe
          shareUrl: updatedQuotation?.pdfUrl || pdfUrl,
          webUrl: shareUrl, // Mantener la URL web para referencia
          shareToken,
          isPublic: updatedQuotation.isPublic,
          expiresAt: updatedQuotation.expiresAt,
          quotationId: savedQuotation.id,
          pdfUrl: updatedQuotation?.pdfUrl || null,
        },
      }
    } catch (error) {
      this.logger.error('Error guardando cotización y generando link:', error)
      throw error
    }
  }

  /**
   * Busca una cotización existente con los mismos datos
   */
  async findExistingQuotation(quotationData: any, userId: string) {
    try {
      this.logger.log(`Buscando cotización existente para usuario: ${userId}`)

      // Obtener todas las cotizaciones del usuario
      const userQuotations = await (this.prisma as any).quotation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      if (!userQuotations || userQuotations.length === 0) {
        return null
      }

      // Crear un hash único para comparar cotizaciones
      const createQuotationHash = (data: any) => {
        const { courseImage, ...quotationData } = data

        // Normalizar los datos para la comparación
        const normalizedData = {
          courseSearch: quotationData.courseSearch || '',
          courseDetails: quotationData.courseDetails || '',
          positions: Array.isArray(quotationData.positions)
            ? quotationData.positions.sort()
            : [],
          areas: Array.isArray(quotationData.areas)
            ? quotationData.areas.sort()
            : [],
          otherArea: quotationData.otherArea || '',
          courseLevel: quotationData.courseLevel || '',
          courseDuration: quotationData.courseDuration || '',
          courseModality: quotationData.courseModality || '',
          numberOfPeople: parseInt(quotationData.numberOfPeople) || 0,
          facilities: Array.isArray(quotationData.facilities)
            ? quotationData.facilities.sort()
            : [],
          country: quotationData.country || '',
          state: quotationData.state || '',
          city: quotationData.city || '',
          address: quotationData.address || '',
          tentativeDate: quotationData.tentativeDate
            ? new Date(quotationData.tentativeDate).toISOString()
            : null,
        }

        return JSON.stringify({
          ...normalizedData,
          courseImage: courseImage || null,
        })
      }

      const currentHash = createQuotationHash(quotationData)
      this.logger.log(`Hash actual: ${currentHash}`)

      // Buscar una cotización existente con el mismo hash
      for (const quotation of userQuotations) {
        if (quotation.quotationData) {
          const existingHash = createQuotationHash({
            ...quotation.quotationData,
            courseImage: quotation.courseImage,
          })

          this.logger.log(
            `Hash existente para ${quotation.id}: ${existingHash}`,
          )

          if (existingHash === currentHash) {
            this.logger.log(`Cotización existente encontrada: ${quotation.id}`)
            return quotation
          }
        }
      }

      return null
    } catch (error) {
      this.logger.error('Error buscando cotización existente:', error)
      return null
    }
  }

  /**
   * Genera un link de cotización
   */
  async generateQuotationLink(
    quotationId: string,
    userId: string,
    options: CreateShareLinkDto = {},
  ) {
    try {
      this.logger.log(`Generando link para cotización: ${quotationId}`)

      // Verificar que la cotización existe y pertenece al usuario
      const quotation = await (this.prisma as any).quotation.findFirst({
        where: {
          id: quotationId,
          userId: userId,
        },
      })

      if (!quotation) {
        throw new NotFoundException(
          'Cotización no encontrada o no tienes permisos',
        )
      }

      // Generar token único
      const shareToken = this.generateShareToken()

      // Actualizar la cotización con el token
      let updatedQuotation = await (this.prisma as any).quotation.update({
        where: { id: quotationId },
        data: {
          shareToken,
          isPublic: options.isPublic || false,
          expiresAt: options.expiresAt ? new Date(options.expiresAt) : null,
        },
      })

      // Generar PDF y subir a Firebase Storage (si no existe o siempre que se genere link)
      try {
        this.logger.log('Generando PDF para cotización existente...')
        const pdfData = {
          ...updatedQuotation.quotationData,
          createdAt:
            updatedQuotation.quotationData?.createdAt ||
            updatedQuotation.createdAt,
          aiGeneratedImage:
            updatedQuotation.quotationData?.courseImage ||
            updatedQuotation.courseImage ||
            undefined,
        }
        const pdfBuffer = await this.pdfService.generateQuotationPDF(
          pdfData as any,
        )

        const rawName =
          updatedQuotation.quotationData?.courseName ||
          updatedQuotation.quotationData?.courseSearch ||
          'cotizacion'
        const safeName = String(rawName)
          .replace(/[^a-zA-Z0-9]/g, '-')
          .substring(0, 50)
        const fileName = `cotizacion-${safeName}-${Date.now()}.pdf`

        const publicUrl = await this.firebasePdfService.uploadPdfBuffer(
          pdfBuffer,
          {
            userId,
            quotationId,
            fileName,
          },
        )

        // Guardar URL y metadatos del PDF en la BD
        updatedQuotation = await (this.prisma as any).quotation.update({
          where: { id: quotationId },
          data: {
            pdfUrl: publicUrl,
            pdfFileName: fileName,
            pdfPath: `${userId}/${quotationId}/${fileName}`,
            pdfUploadedAt: new Date(),
          },
        })

        this.logger.log(`PDF subido y guardado: ${publicUrl}`)
      } catch (pdfError) {
        this.logger.error('Error generando/subiendo PDF:', pdfError)
      }

      const baseUrl = process.env.FRONTEND_URL || 'https://apps.solinal.org'
      const shareUrl = `${baseUrl}/quotation/${shareToken}`
      const pdfUrl = `${baseUrl}/pdf/${shareToken}`

      this.logger.log(`Link generado exitosamente: ${shareUrl}`)
      this.logger.log(`PDF URL generado: ${pdfUrl}`)

      return {
        success: true,
        data: {
          shareUrl: updatedQuotation?.pdfUrl || pdfUrl,
          webUrl: shareUrl, // Mantener la URL web para referencia
          shareToken,
          isPublic: updatedQuotation.isPublic,
          expiresAt: updatedQuotation.expiresAt,
          pdfUrl: updatedQuotation?.pdfUrl || null,
        },
      }
    } catch (error) {
      this.logger.error('Error generando link de cotización:', error)
      throw error
    }
  }

  /**
   * Obtiene una cotización por su token de compartir
   */
  async getQuotationByToken(shareToken: string) {
    try {
      this.logger.log(`Obteniendo cotización por token: ${shareToken}`)

      const quotation = await (this.prisma as any).quotation.findUnique({
        where: { shareToken },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      if (!quotation) {
        throw new NotFoundException('Cotización no encontrada')
      }

      // Verificar si ha expirado
      if (quotation.expiresAt && new Date(quotation.expiresAt) < new Date()) {
        throw new ForbiddenException('Esta cotización ha expirado')
      }

      return {
        success: true,
        data: quotation,
      }
    } catch (error) {
      this.logger.error('Error obteniendo cotización por token:', error)
      throw error
    }
  }

  /**
   * Verifica si el usuario tiene acceso a una cotización
   */
  async checkQuotationAccess(quotationId: string, userId: string) {
    try {
      const quotation = await (this.prisma as any).quotation.findUnique({
        where: { id: quotationId },
        include: {
          quotationAccess: {
            where: { userId },
          },
        },
      })

      if (!quotation) {
        return { hasAccess: false, reason: 'Cotización no encontrada' }
      }

      // Si es el propietario
      if (quotation.userId === userId) {
        return { hasAccess: true, level: 'owner' }
      }

      // Si es pública
      if (quotation.isPublic) {
        return { hasAccess: true, level: 'public' }
      }

      // Verificar acceso específico
      const access = quotation.quotationAccess[0]
      if (access) {
        return { hasAccess: true, level: access.accessLevel }
      }

      return { hasAccess: false, reason: 'Sin permisos' }
    } catch (error) {
      this.logger.error('Error verificando acceso:', error)
      return { hasAccess: false, reason: 'Error de verificación' }
    }
  }

  /**
   * Comparte una cotización con un usuario específico
   */
  async shareWithUser(
    quotationId: string,
    ownerId: string,
    shareData: ShareWithUserDto,
  ) {
    try {
      this.logger.log(
        `Compartiendo cotización ${quotationId} con usuario ${shareData.userId}`,
      )

      // Verificar que la cotización existe y pertenece al usuario
      const quotation = await this.prisma.quotation.findFirst({
        where: {
          id: quotationId,
          userId: ownerId,
        },
      })

      if (!quotation) {
        throw new NotFoundException(
          'Cotización no encontrada o no tienes permisos',
        )
      }

      // Verificar que el usuario objetivo existe
      const targetUser = await this.prisma.user.findUnique({
        where: { id: shareData.userId },
      })

      if (!targetUser) {
        throw new NotFoundException('Usuario objetivo no encontrado')
      }

      // Crear o actualizar acceso
      const access = await (this.prisma as any).quotationAccess.upsert({
        where: {
          quotationId_userId: {
            quotationId,
            userId: shareData.userId,
          },
        },
        update: {
          accessLevel: shareData.accessLevel as any,
          grantedBy: ownerId,
        },
        create: {
          quotationId,
          userId: shareData.userId,
          accessLevel: shareData.accessLevel as any,
          grantedBy: ownerId,
        },
      })

      this.logger.log(`Acceso otorgado exitosamente: ${access.id}`)

      return {
        success: true,
        data: access,
      }
    } catch (error) {
      this.logger.error('Error compartiendo cotización:', error)
      throw error
    }
  }

  /**
   * Revoca el acceso de un usuario a una cotización
   */
  async revokeAccess(
    quotationId: string,
    ownerId: string,
    targetUserId: string,
  ) {
    try {
      this.logger.log(
        `Revocando acceso de usuario ${targetUserId} a cotización ${quotationId}`,
      )

      // Verificar que la cotización existe y pertenece al usuario
      const quotation = await (this.prisma as any).quotation.findFirst({
        where: {
          id: quotationId,
          userId: ownerId,
        },
      })

      if (!quotation) {
        throw new NotFoundException(
          'Cotización no encontrada o no tienes permisos',
        )
      }

      // Eliminar acceso
      await this.prisma.quotationAccess.deleteMany({
        where: {
          quotationId,
          userId: targetUserId,
        },
      })

      this.logger.log(`Acceso revocado exitosamente`)

      return {
        success: true,
        message: 'Acceso revocado exitosamente',
      }
    } catch (error) {
      this.logger.error('Error revocando acceso:', error)
      throw error
    }
  }

  /**
   * Obtiene las cotizaciones compartidas del usuario
   */
  async getSharedQuotations(userId: string) {
    try {
      this.logger.log(
        `Obteniendo cotizaciones compartidas para usuario: ${userId}`,
      )

      const sharedQuotations = await this.prisma.quotationAccess.findMany({
        where: { userId },
        include: {
          quotation: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { grantedAt: 'desc' },
      })

      return {
        success: true,
        data: sharedQuotations,
      }
    } catch (error) {
      this.logger.error('Error obteniendo cotizaciones compartidas:', error)
      throw error
    }
  }

  /**
   * Obtiene las cotizaciones del usuario con sus links
   */
  async getUserQuotations(userId: string) {
    try {
      this.logger.log(`Obteniendo cotizaciones del usuario: ${userId}`)

      const quotations = await this.prisma.quotation.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      })

      return {
        success: true,
        data: quotations,
      }
    } catch (error) {
      this.logger.error('Error obteniendo cotizaciones del usuario:', error)
      throw error
    }
  }

  /**
   * Obtiene el link existente de una cotización
   */
  async getExistingLink(quotationId: string, userId: string) {
    try {
      this.logger.log(
        `Obteniendo link existente para cotización: ${quotationId}`,
      )

      // Verificar que la cotización existe y pertenece al usuario
      const quotation = await (this.prisma as any).quotation.findFirst({
        where: {
          id: quotationId,
          userId: userId,
        },
      })

      if (!quotation) {
        return null
      }

      // Si la cotización tiene un shareToken, generar el link
      if (quotation.shareToken) {
        const baseUrl = process.env.FRONTEND_URL || 'https://apps.solinal.org'
        const shareUrl = `${baseUrl}/quotation/${quotation.shareToken}`
        const pdfUrl = `${baseUrl}/pdf/${quotation.shareToken}`

        return {
          shareUrl: quotation.pdfUrl || pdfUrl,
          webUrl: shareUrl,
          shareToken: quotation.shareToken,
          isPublic: quotation.isPublic,
          expiresAt: quotation.expiresAt,
          quotationId: quotation.id,
          pdfUrl: quotation.pdfUrl || null,
        }
      }

      return null
    } catch (error) {
      this.logger.error('Error obteniendo link existente:', error)
      return null
    }
  }

  /**
   * Elimina una cotización y todos sus accesos
   */
  async deleteQuotation(quotationId: string, userId: string) {
    try {
      this.logger.log(`Eliminando cotización: ${quotationId}`)

      // Verificar que la cotización existe y pertenece al usuario
      const quotation = await (this.prisma as any).quotation.findFirst({
        where: {
          id: quotationId,
          userId: userId,
        },
      })

      if (!quotation) {
        throw new NotFoundException(
          'Cotización no encontrada o no tienes permisos',
        )
      }

      // Eliminar la cotización (los accesos se eliminan automáticamente por CASCADE)
      await (this.prisma as any).quotation.delete({
        where: { id: quotationId },
      })

      this.logger.log(`Cotización eliminada exitosamente`)

      return {
        success: true,
        message: 'Cotización eliminada exitosamente',
      }
    } catch (error) {
      this.logger.error('Error eliminando cotización:', error)
      throw error
    }
  }

  /**
   * Genera un token único para compartir
   */
  private generateShareToken(): string {
    return randomBytes(16).toString('hex')
  }
}
