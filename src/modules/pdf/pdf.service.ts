import { Injectable, Logger } from '@nestjs/common'
import * as htmlPdf from 'html-pdf-node'
import * as https from 'https'
import * as http from 'http'
import * as puppeteer from 'puppeteer'

export interface QuotationPDFData {
  courseName: string
  duration: string
  durationDays: string
  durationHours: number
  modality: string
  level: string
  participants: number
  priceUSD: number
  location: string
  objectives: {
    general: string[]
    specific: string[]
  }
  youWillLearn: string[]
  prerequisites: string
  targetAudience: string
  courseContent?: {
    tema: string
    duracionHoras: number
    subtemas: string[]
  }[]
  content?: {
    tema: string
    duracionHoras: number
    subtemas: string[]
  }[]
  courseMaterials: string[]
  createdAt?: Date | string
  aiGeneratedImage?: string // URL o base64 de la imagen generada por IA
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name)

  async generateQuotationPDF(quotationData: QuotationPDFData): Promise<Buffer> {
    try {
      this.logger.log(
        'Iniciando generación de PDF con html-pdf-node para:',
        quotationData.courseName,
      )

      this.logger.log('Procesando imagen de IA para PDF')
      this.logger.log(
        'Imagen recibida:',
        quotationData.aiGeneratedImage ? 'Sí' : 'No',
      )

      let processedData = { ...quotationData }

      // Si tenemos una URL de imagen, convertirla a base64 en el backend
      if (
        quotationData.aiGeneratedImage &&
        quotationData.aiGeneratedImage.startsWith('http')
      ) {
        try {
          this.logger.log('Convirtiendo URL de imagen a base64...')
          processedData.aiGeneratedImage = await this.convertImageToBase64(
            quotationData.aiGeneratedImage,
          )
          this.logger.log('Imagen convertida a base64 exitosamente')
        } catch (error) {
          this.logger.error('Error convirtiendo imagen a base64:', error)
          processedData.aiGeneratedImage = undefined
        }
      }

      if (processedData.aiGeneratedImage) {
        this.logger.log(
          'Tipo de imagen:',
          processedData.aiGeneratedImage.startsWith('data:') ? 'base64' : 'URL',
        )
      }

      // Generar HTML para la portada
      const coverHtml = this.generateCoverHTML(processedData)
      this.logger.log('HTML de portada generado')

      // Generar HTML para el contenido
      const contentHtml = this.generateContentHTML(processedData)
      this.logger.log('HTML de contenido generado')

      // Combinar HTML completo
      const fullHtml = this.generateFullHTML(coverHtml, contentHtml)
      this.logger.log('HTML completo generado')

      // Generar PDF con html-pdf-node
      this.logger.log('Iniciando generación de PDF...')
      const pdfBuffer = await this.generatePDFFromHTML(fullHtml)

      this.logger.log('PDF generado exitosamente con html-pdf-node')
      return pdfBuffer
    } catch (error) {
      this.logger.error('Error generando PDF con html-pdf-node:', error)
      throw error
    }
  }

  private generateCoverHTML(data: QuotationPDFData): string {
    const imageHeight = 490
    const hasImage = data.aiGeneratedImage && data.aiGeneratedImage.length > 0

    this.logger.log(`Generando HTML de portada - Tiene imagen: ${hasImage}`)
    if (hasImage && data.aiGeneratedImage) {
      this.logger.log(
        `Imagen base64: ${data.aiGeneratedImage.substring(0, 50)}...`,
      )
      this.logger.log(
        `Longitud de imagen: ${data.aiGeneratedImage.length} caracteres`,
      )
      this.logger.log(
        `¿Es base64 válido?: ${data.aiGeneratedImage.startsWith('data:image/')}`,
      )
    } else {
      this.logger.log('No hay imagen o imagen vacía')
    }

    return `
      <div style="background: white; padding: 0; margin: 0;">
        <!-- Imagen de IA -->
        <div style="height: ${imageHeight}px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); position: relative; overflow: hidden;">
          ${
            hasImage
              ? `<img src="${data.aiGeneratedImage}" style="width: 100%; height: 100%; object-fit: cover; position: absolute; top: 0; left: 0;" alt="Imagen generada por IA">`
              : ''
          }
          <div style="text-align: center; color: white; font-family: 'Inter', Arial, sans-serif; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); ${hasImage ? 'display: none;' : 'display: block;'}">
            <div style="font-size: 48px; margin-bottom: 10px;">🎓</div>
            <div style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">Formación Corporativa</div>
            <div style="font-size: 16px; opacity: 0.9;">${data.courseName}</div>
          </div>
        </div>

        <!-- Contenido de la portada -->
        <div style="padding: 30px 50px; background: white; position: relative;">
          
          <!-- Título del curso -->
          <h1 style="
            font-size: 36px; 
            font-weight: 900; 
            font-family: 'Inter', Arial, sans-serif;
            color: #1C3050; 
            margin: 0 0 15px 0; 
            text-align: left;
            line-height: 1.1;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          ">${data.courseName}</h1>

          <!-- Sección "Para..." -->
          <div style="
            font-size: 14px; 
            font-weight: 700; 
            font-family: 'Inter', Arial, sans-serif;
            color: #1ed493; 
            text-align: left;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: -0.2px;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          ">
            PARA PERSONAL OPERATIVO, SUPERVISORES, JEFES, LÍDERES DE ÁREA, GERENTES
          </div>
        </div>

        <!-- Logo de Solinal en esquina inferior derecha de toda la portada -->
        <div style="position: absolute; bottom: 30px; right: 50px;">
          <img src="https://www.solinal.org/wp-content/uploads/2023/12/Logo-para-version-fondo-blanco-1024x238.png" 
               style="width: 120px; height: 28px;" alt="Solinal">
        </div>
      </div>
    `
  }

  private generateContentHTML(data: QuotationPDFData): string {
    return `
      <div style="padding: 50px; background: white;">
        <!-- Header -->
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 24px; font-family: 'Inter', Arial, sans-serif; font-weight: 700; color: #1C3050; margin: 0;">SOLINAL</h1>
          <p style="font-size: 12px; color: #64748B; margin: 5px 0;">Formación Corporativa</p>
          <hr style="border: none; height: 2px; background-color: #1C3050; margin: 20px 0;">
          <h2 style="font-size: 20px; font-family: 'Inter', Arial, sans-serif; font-weight: 700; color: #1C3050; margin: 0;">${data.courseName}</h2>
          <p style="font-size: 10px; color: #64748B; margin: 5px 0;">
            Cotización generada: ${data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-ES') : 'Fecha no disponible'}
          </p>
        </div>

        <!-- Información del curso -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 16px; font-family: 'Inter', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">INFORMACIÓN DEL CURSO</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div><strong>Duración:</strong> ${data.duration}</div>
            <div><strong>Duración en días:</strong> ${data.durationDays}</div>
            <div><strong>Modalidad:</strong> ${data.modality}</div>
            <div><strong>Nivel:</strong> ${data.level}</div>
            <div><strong>Participantes:</strong> ${data.participants}</div>
            <div><strong>Precio:</strong> $${data.priceUSD} USD</div>
          </div>
        </div>

        <!-- Objetivos generales -->
        ${
          data.objectives?.general?.length > 0
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">OBJETIVOS GENERALES</h3>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
              ${data.objectives.general
                .map(
                  (obj) => `
                <div style="
                  display: flex; 
                  align-items: flex-start; 
                  margin-bottom: 6px;
                ">
                  <span style="
                    display: inline-block; 
                    width: 6px; 
                    height: 6px; 
                    background-color: #00eebc; 
                    margin-right: 8px; 
                    margin-top: 4px; 
                    border-radius: 1px;
                    flex-shrink: 0;
                  "></span>
                  <span style="flex: 1;">${obj}</span>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Objetivos específicos -->
        ${
          data.objectives?.specific?.length > 0
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">OBJETIVOS ESPECÍFICOS</h3>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
              ${data.objectives.specific
                .map(
                  (obj) => `
                <div style="
                  display: flex; 
                  align-items: flex-start; 
                  margin-bottom: 6px;
                ">
                  <span style="
                    display: inline-block; 
                    width: 6px; 
                    height: 6px; 
                    background-color: #00eebc; 
                    margin-right: 8px; 
                    margin-top: 4px; 
                    border-radius: 1px;
                    flex-shrink: 0;
                  "></span>
                  <span style="flex: 1;">${obj}</span>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- USTED APRENDERÁ -->
        ${
          data.youWillLearn?.length > 0
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">USTED APRENDERÁ</h3>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
              ${data.youWillLearn
                .map(
                  (item) => `
                <div style="
                  display: flex; 
                  align-items: flex-start; 
                  margin-bottom: 6px;
                ">
                  <span style="
                    display: inline-block; 
                    width: 6px; 
                    height: 6px; 
                    background-color: #00eebc; 
                    margin-right: 8px; 
                    margin-top: 4px; 
                    border-radius: 1px;
                    flex-shrink: 0;
                  "></span>
                  <span style="flex: 1;">${item}</span>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Requisitos previos -->
        ${
          data.prerequisites
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">REQUISITOS PREVIOS</h3>
            <p style="font-size: 11px; color: #64748B; line-height: 1.4;">${data.prerequisites}</p>
          </div>
        `
            : ''
        }

        <!-- Público dirigido -->
        ${
          data.targetAudience
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">PÚBLICO DIRIGIDO</h3>
            <p style="font-size: 11px; color: #64748B; line-height: 1.4;">${data.targetAudience}</p>
          </div>
        `
            : ''
        }

        <!-- Contenido del curso -->
        ${
          (data.content?.length ?? 0) > 0 ||
          (data.courseContent?.length ?? 0) > 0
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">CONTENIDO DEL CURSO</h3>
            ${(data.content || data.courseContent || [])
              .map(
                (topic) => `
              <div style="margin-bottom: 20px;">
                <h4 style="font-size: 12px; font-weight: 700; color: #1C3050; margin: 0 0 8px 0; display: flex; align-items: center;">
                  <span style="
                    display: inline-block; 
                    width: 8px; 
                    height: 8px; 
                    background-color: #00eebc; 
                    margin-right: 8px; 
                    border-radius: 2px;
                  "></span>
                  ${topic.tema} (${topic.duracionHoras}h)
                </h4>
                <div style="margin-left: 16px;">
                  ${topic.subtemas
                    .map(
                      (subtema) => `
                    <div style="
                      display: flex; 
                      align-items: flex-start; 
                      margin-bottom: 4px; 
                      font-size: 10px; 
                      color: #64748B; 
                      line-height: 1.4;
                    ">
                      <span style="
                        display: inline-block; 
                        width: 6px; 
                        height: 6px; 
                        background-color: #00eebc; 
                        margin-right: 8px; 
                        margin-top: 4px; 
                        border-radius: 1px;
                        flex-shrink: 0;
                      "></span>
                      <span style="flex: 1;">${subtema}</span>
                    </div>
                  `,
                    )
                    .join('')}
                </div>
              </div>
            `,
              )
              .join('')}
          </div>
        `
            : ''
        }

        <!-- Material del curso -->
        ${
          data.courseMaterials?.length > 0
            ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 16px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 15px;">MATERIAL DEL CURSO</h3>
            <div style="font-size: 11px; color: #64748B; line-height: 1.4;">
              ${data.courseMaterials
                .map(
                  (material) => `
                <div style="
                  display: flex; 
                  align-items: flex-start; 
                  margin-bottom: 6px;
                ">
                  <span style="
                    display: inline-block; 
                    width: 6px; 
                    height: 6px; 
                    background-color: #00eebc; 
                    margin-right: 8px; 
                    margin-top: 4px; 
                    border-radius: 1px;
                    flex-shrink: 0;
                  "></span>
                  <span style="flex: 1;">✓ ${material}</span>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        <!-- Información de contacto -->
        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <h3 style="font-size: 12px; font-family: 'Calibri', Arial, sans-serif; font-weight: 700; color: #1C3050; margin-bottom: 10px;">CONTACTO</h3>
          <p style="font-size: 10px; color: #64748B; margin: 2px 0;">Solinal - Formación Corporativa</p>
          <p style="font-size: 10px; color: #64748B; margin: 2px 0;">Email: info@solinal.org</p>
          <p style="font-size: 10px; color: #64748B; margin: 2px 0;">Teléfono: +593 99 123 4567</p>
          <p style="font-size: 10px; color: #64748B; margin: 2px 0;">Web: www.solinal.org</p>
        </div>
      </div>
    `
  }

  private generateFullHTML(coverHtml: string, contentHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Cotización - Solinal</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
          
          body {
            margin: 0;
            padding: 0;
            font-family: 'Calibri', Arial, sans-serif;
            line-height: 1.4;
            background: white;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          ul {
            margin: 0;
            padding-left: 20px;
          }
          li {
            margin-bottom: 5px;
          }
          .title-black {
            font-weight: 900;
            font-family: 'Inter', Arial, sans-serif;
          }
          .bold-text {
            font-weight: 700;
            font-family: 'Inter', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        ${coverHtml}
        <div style="page-break-before: always;"></div>
        ${contentHtml}
      </body>
      </html>
    `
  }

  private async convertImageToBase64(imageUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Convirtiendo imagen optimizada: ${imageUrl}`)
      const protocol = imageUrl.startsWith('https:') ? https : http

      // Configuración optimizada para Render
      const options = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        timeout: 15000, // 15 segundos - reducido para Render
      }

      // Timeout más agresivo
      const timeoutId = setTimeout(() => {
        this.logger.error('Timeout en request de imagen optimizada')
        reject(new Error('Timeout en request de imagen'))
      }, 15000) // 15 segundos

      const request = protocol.get(imageUrl, options, (response) => {
        clearTimeout(timeoutId)

        if (response.statusCode !== 200) {
          this.logger.warn(
            `HTTP ${response.statusCode} al descargar imagen: ${imageUrl}`,
          )
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        const chunks: Buffer[] = []
        let totalSize = 0
        const maxSize = 10 * 1024 * 1024 // 10MB máximo para imágenes de DALL-E

        response.on('data', (chunk) => {
          totalSize += chunk.length
          if (totalSize > maxSize) {
            this.logger.warn('Imagen demasiado grande, omitiendo...')
            request.destroy()
            reject(new Error('Imagen demasiado grande'))
            return
          }
          chunks.push(chunk)
        })

        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks)

            // Verificar tamaño final
            if (buffer.length > maxSize) {
              this.logger.warn(
                `Buffer demasiado grande (${buffer.length} bytes), omitiendo imagen`,
              )
              reject(new Error('Imagen demasiado grande'))
              return
            }

            const base64 = buffer.toString('base64')
            const mimeType = response.headers['content-type'] || 'image/png'
            const result = `data:${mimeType};base64,${base64}`

            this.logger.log(
              `Imagen optimizada convertida, tamaño: ${buffer.length} bytes`,
            )
            resolve(result)
          } catch (error) {
            this.logger.error('Error procesando imagen optimizada:', error)
            reject(error)
          }
        })
        response.on('error', (error) => {
          this.logger.error('Error en response de imagen:', error)
          reject(error)
        })
      })

      request.on('error', (error) => {
        clearTimeout(timeoutId)
        this.logger.error('Error en request de imagen:', error)
        reject(error)
      })

      request.on('timeout', () => {
        clearTimeout(timeoutId)
        this.logger.error('Timeout en request de imagen')
        request.destroy()
        reject(new Error('Timeout en request de imagen'))
      })
    })
  }

  private async generatePDFFromHTML(html: string): Promise<Buffer> {
    try {
      this.logger.log('Iniciando generación de PDF optimizada para Render...')

      // Configurar opciones optimizadas para Render (512MB limit)
      const options = {
        format: 'A4',
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: true,
        timeout: 60000, // 1 minuto - reducido para evitar timeouts
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--memory-pressure-off',
          '--max_old_space_size=256', // Limitar memoria de Node.js a 256MB
          '--single-process', // Usar un solo proceso
          '--no-zygote',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      }

      this.logger.log('Configuración optimizada para Render:', {
        format: options.format,
        timeout: options.timeout,
        memoryLimit: '256MB',
        args: options.args.length,
      })

      // Generar PDF con timeout más agresivo
      const pdfPromise = htmlPdf.generatePdf({ content: html }, options)

      // Timeout más corto para evitar consumo excesivo
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error('Timeout generando PDF - Límite de memoria alcanzado'),
          )
        }, 60000) // 1 minuto
      })

      const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise])

      this.logger.log(
        `PDF generado exitosamente, tamaño: ${pdfBuffer.length} bytes`,
      )
      return pdfBuffer
    } catch (error) {
      this.logger.error('Error generando PDF optimizado:', error)

      // Si falla, intentar sin imagen para reducir memoria
      if (html.includes('aiGeneratedImage')) {
        this.logger.log('Reintentando sin imagen para reducir memoria...')
        const htmlWithoutImage = html.replace(
          /<img[^>]*aiGeneratedImage[^>]*>/gi,
          '',
        )
        return this.generatePDFFromHTML(htmlWithoutImage)
      }

      throw new Error(`Error generando PDF: ${error.message}`)
    }
  }
}
