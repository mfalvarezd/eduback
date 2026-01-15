import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import OpenAI from 'openai'

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name)
  private openai: OpenAI

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY')
    this.logger.log('Verificando configuración de OpenAI...')
    this.logger.log('API Key configurada:', apiKey ? 'Sí' : 'No')

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY no está configurada')
      throw new Error('OPENAI_API_KEY no está configurada')
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    })

    this.logger.log('Cliente OpenAI inicializado correctamente')
  }

  private createFallbackResponse(
    courseDescription: string,
    userDuration?: string,
    userModality?: string,
    courseDetails?: string,
    positions?: string[],
    areas?: string[],
  ): any {
    this.logger.warn('Usando respuesta de fallback debido a error en OpenAI')

    // Calcular duración basada en la selección del usuario
    let duration = '8h'
    let priceUSD = 280

    if (userDuration && userDuration !== 'recommended') {
      duration = userDuration
      const hours = parseInt(userDuration.replace('h', ''))
      priceUSD = hours * 35
    }

    // Generar nombre del curso combinando descripción principal e información adicional
    let courseName = courseDescription || 'Curso de formación'
    if (courseDetails && courseDetails.trim()) {
      courseName = `${courseDescription} - ${courseDetails.trim()}`
    }

    return {
      courseName: courseName,
      duration: duration,
      participants: 10,
      modality: userModality || 'presencial',
      priceUSD: priceUSD,
      objectives: {
        general: [
          'Comprender los fundamentos del tema',
          'Aplicar conocimientos en situaciones prácticas',
        ],
        specific: [
          'Identificar los conceptos clave',
          'Desarrollar habilidades prácticas',
          'Evaluar situaciones reales',
          'Implementar mejores prácticas',
        ],
      },
      content: [
        {
          tema: 'Fundamentos',
          duracionHoras: Math.floor(parseInt(duration.replace('h', '')) / 2),
          subtemas: ['Conceptos básicos', 'Principios fundamentales'],
        },
        {
          tema: 'Aplicaciones prácticas',
          duracionHoras: Math.ceil(parseInt(duration.replace('h', '')) / 2),
          subtemas: ['Casos de estudio', 'Ejercicios prácticos'],
        },
      ],
    }
  }

  async testOpenAIConnection(): Promise<any> {
    try {
      this.logger.log('Probando conexión con OpenAI...')

      // Probar con una solicitud simple
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Responde solo con "OK" si puedes leer este mensaje.',
          },
        ],
        max_tokens: 10,
      })

      const response = completion.choices[0]?.message?.content
      this.logger.log('Respuesta de prueba:', response)

      return {
        status: 'connected',
        response: response,
        model: 'gpt-3.5-turbo',
      }
    } catch (error) {
      this.logger.error('Error en prueba de conexión:', error)
      throw error
    }
  }

  async generateCourseImage(
    courseName: string,
    courseDescription: string,
  ): Promise<string | null> {
    try {
      this.logger.log('Iniciando generación de imagen para:', courseName)

      const prompt = `
        Create a realistic, professional photograph representing this corporate training course:
        
        Course name: ${courseName}
        Description: ${courseDescription}
        
        The image must be:
        - Professional and corporate style
        - Modern and visually appealing
        - Representative of the course topic
        - NO TEXT or overlays on the image
        - Landscape orientation (16:9 aspect ratio)
        - Realistic photographic style, not illustration
        - Set in a professional environment (office, laboratory, workshop, factory, etc.)
        - Use relevant visual elements that represent the course content
        - Natural lighting and professional composition
        - High-quality, sharp focus with shallow depth of field
        - People of images don't have to show religion or ethnicity clothes, just normal clothes or uniforms
        
        Style: Realistic photographic shot with natural lighting, similar to professional product photography or documentary style. The image should capture real people, objects, or environments related to the course topic. No text, logos, or overlays should be present on the image.
        
        Examples of appropriate subjects:
        - For food industry courses: People working in kitchens, food production facilities, or laboratories
        - For technical courses: People using equipment, working with tools, or in technical environments
        - For business courses: People in office settings, meetings, or professional environments
        - For safety courses: People wearing safety equipment or in industrial settings
        
        Color palette: Natural, realistic colors. The overall tone should be professional and authentic while being visually appealing.
      `

      this.logger.log('Enviando prompt a DALL-E...')

      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1792x1024',
        quality: 'standard',
        style: 'natural',
      })

      this.logger.log(
        'Respuesta de DALL-E recibida:',
        response.data?.length || 0,
        'imágenes',
      )

      if (response.data && response.data.length > 0 && response.data[0].url) {
        this.logger.log('URL de imagen generada:', response.data[0].url)
        return response.data[0].url
      } else {
        this.logger.warn('No se generó ninguna imagen válida')
        throw new Error('No se generó ninguna imagen')
      }
    } catch (error) {
      this.logger.error('Error al generar imagen del curso:', error)
      // Retornar null en caso de error
      return null
    }
  }

  async generateCourseContent(
    courseDescription: string,
    userDuration?: string,
    userModality?: string,
    userLevel?: string,
    courseDetails?: string,
    positions?: string[],
    areas?: string[],
  ): Promise<any> {
    try {
      const durationText = userDuration
        ? `Duración solicitada: ${userDuration}`
        : ''
      const modalityText = userModality
        ? `Modalidad solicitada: ${userModality}`
        : ''
      const levelText = userLevel ? `Nivel solicitado: ${userLevel}` : ''
      const detailsText = courseDetails
        ? `Información adicional: ${courseDetails}`
        : ''
      const positionsText =
        positions && positions.length > 0
          ? `Cargos seleccionados: ${positions.join(', ')}`
          : ''
      const areasText =
        areas && areas.length > 0
          ? `Áreas seleccionadas: ${areas.join(', ')}`
          : ''

      const prompt = `
        Genera un curso corporativo para: ${courseDescription}
        ${detailsText}
        ${durationText}
        ${modalityText}
        ${levelText}
        ${positionsText}
        ${areasText}
        
        Genera este JSON con MÚLTIPLES temas y subtemas:
        {
          "courseName": "Nombre del curso que combine la descripción principal con la información adicional",
          "duration": "${userDuration || '8h'}",
          "durationDays": "X días",
          "participants": 10,
          "modality": "${userModality || 'presencial'}",
          "priceUSD": ${userDuration ? parseInt(userDuration.replace('h', '')) * 35 : 280},
          "objectives": {
            "general": ["Objetivo general 1", "Objetivo general 2", "Objetivo general 3", "Objetivo general 4"],
            "specific": ["Objetivo específico 1", "Objetivo específico 2", "Objetivo específico 3", "Objetivo específico 4", "Objetivo específico 5", "Objetivo específico 6", "Objetivo específico 7", "Objetivo específico 8"]
          },
          "youWillLearn": ["Lo que aprenderá 1", "Lo que aprenderá 2", "Lo que aprenderá 3", "Lo que aprenderá 4", "Lo que aprenderá 5", "Lo que aprenderá 6", "Lo que aprenderá 7", "Lo que aprenderá 8", "Lo que aprenderá 9", "Lo que aprenderá 10"],
          "prerequisites": "Requisitos previos específicos para este curso",
          "targetAudience": "Público objetivo específico para este curso",
          "courseMaterials": ["Manual del participante", "Certificado de participación", "Material digital", "Guías prácticas", "Presentaciones", "Casos de estudio", "Evaluaciones", "Acceso a plataforma"],
          "content": [
            {
              "tema": "Tema 1: Fundamentos",
              "duracionHoras": 2,
              "subtemas": ["Subtema 1.1", "Subtema 1.2", "Subtema 1.3", "Subtema 1.4"]
            },
            {
              "tema": "Tema 2: Aplicaciones",
              "duracionHoras": 2,
              "subtemas": ["Subtema 2.1", "Subtema 2.2", "Subtema 2.3", "Subtema 2.4"]
            },
            {
              "tema": "Tema 3: Casos prácticos",
              "duracionHoras": 2,
              "subtemas": ["Subtema 3.1", "Subtema 3.2", "Subtema 3.3", "Subtema 3.4"]
            },
            {
              "tema": "Tema 4: Evaluación",
              "duracionHoras": 2,
              "subtemas": ["Subtema 4.1", "Subtema 4.2", "Subtema 4.3", "Subtema 4.4"]
            }
          ]
        }
        
        REGLAS OBLIGATORIAS:
        - Para cursos de 4-8 horas: genera 4-6 temas
        - Para cursos de 12-16 horas: genera 6-8 temas  
        - Para cursos de 20-24 horas: genera 8-12 temas
        - Distribuye las horas equitativamente entre los temas
        - Cada tema debe tener 3-5 subtemas
        - Genera contenido específico para: ${courseDescription}
        - Combina la descripción principal con la información adicional en el nombre
        - Ajusta la complejidad según el nivel: ${userLevel || 'intermedio'}
        - Considera los cargos y áreas seleccionados para personalizar el contenido
        - Responde SOLO el JSON
      `

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto en formación corporativa. Genera contenido específico y relevante para cada curso. SIEMPRE genera MÚLTIPLES temas según la duración del curso. Combina la descripción principal con la información adicional para el nombre. Responde ÚNICAMENTE en formato JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        this.logger.warn('No se recibió respuesta de OpenAI, usando fallback')
        this.logger.warn('Parámetros recibidos:', {
          courseDescription,
          courseDetails,
          userDuration,
          userModality,
          userLevel,
          positions,
          areas,
        })
        return this.createFallbackResponse(
          courseDescription,
          userDuration,
          userModality,
          courseDetails,
          positions,
          areas,
        )
      }

      // Log detallado de la respuesta para debugging
      this.logger.log('=== RESPUESTA COMPLETA DE OPENAI ===')
      this.logger.log('Respuesta completa:', response)
      this.logger.log('Longitud de respuesta:', response.length)
      this.logger.log('Primeros 200 caracteres:', response.substring(0, 200))
      this.logger.log(
        'Últimos 200 caracteres:',
        response.substring(response.length - 200),
      )
      this.logger.log('=== FIN RESPUESTA ===')

      // Intentar limpiar la respuesta antes de parsear
      let cleanedResponse = response.trim()

      // Buscar el inicio del JSON
      const jsonStart = cleanedResponse.indexOf('{')
      const jsonEnd = cleanedResponse.lastIndexOf('}')

      this.logger.log('Posición inicio JSON:', jsonStart)
      this.logger.log('Posición fin JSON:', jsonEnd)

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
        this.logger.log('JSON extraído:', cleanedResponse)
      } else {
        this.logger.error('No se encontró JSON válido en la respuesta')
        this.logger.error('Respuesta original:', response)
      }

      // Intentar parsear la respuesta JSON
      try {
        const parsedResponse = JSON.parse(cleanedResponse)

        // Asegurar que el precio se calcule correctamente
        if (parsedResponse.duration && !parsedResponse.priceUSD) {
          const hours = parseInt(parsedResponse.duration.replace('h', ''))
          parsedResponse.priceUSD = hours * 35
        }

        // Validar que la suma de horas de los temas coincida con la duración total
        if (parsedResponse.content && parsedResponse.duration) {
          const totalHoras = parseInt(parsedResponse.duration.replace('h', ''))
          const totalHorasTemas = parsedResponse.content.reduce(
            (sum, tema) => sum + (tema.duracionHoras || 0),
            0,
          )

          if (totalHorasTemas !== totalHoras) {
            // Ajustar automáticamente si no coinciden
            const factor = totalHoras / totalHorasTemas
            parsedResponse.content = parsedResponse.content.map((tema) => ({
              ...tema,
              duracionHoras: Math.round(tema.duracionHoras * factor),
            }))
          }
        }

        this.logger.log('Respuesta de OpenAI procesada exitosamente')
        this.logger.log('Nombre del curso generado:', parsedResponse.courseName)
        this.logger.log(
          'Número de temas generados:',
          parsedResponse.content?.length || 0,
        )
        this.logger.log(
          'Temas generados:',
          parsedResponse.content?.map((t) => t.tema) || [],
        )
        return parsedResponse
      } catch (parseError) {
        this.logger.error('=== ERROR EN PARSING ===')
        this.logger.error('Error al parsear respuesta de OpenAI:', parseError)
        this.logger.error('Mensaje de error:', parseError.message)
        this.logger.error('Respuesta original:', response)
        this.logger.error('Respuesta limpia:', cleanedResponse)
        this.logger.error('=== FIN ERROR PARSING ===')

        // Intentar limpiar más la respuesta
        try {
          // Remover posibles caracteres extra al inicio y final
          let moreCleanedResponse = cleanedResponse
            .replace(/^[^{]*/, '') // Remover todo antes del primer {
            .replace(/[^}]*$/, '') // Remover todo después del último }
            .trim()

          this.logger.log('Respuesta más limpia:', moreCleanedResponse)

          // Intentar parsear de nuevo
          const retryParsedResponse = JSON.parse(moreCleanedResponse)

          this.logger.log('Respuesta parseada en segundo intento')
          this.logger.log(
            'Nombre del curso generado:',
            retryParsedResponse.courseName,
          )
          return retryParsedResponse
        } catch (secondParseError) {
          this.logger.error('=== ERROR EN SEGUNDO INTENTO ===')
          this.logger.error(
            'Error en segundo intento de parsing:',
            secondParseError,
          )
          this.logger.error('Mensaje de error:', secondParseError.message)

          // Intentar extraer solo el JSON usando regex
          try {
            this.logger.log('Intentando extracción con regex...')
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              this.logger.log('JSON encontrado con regex:', jsonMatch[0])
              const regexParsedResponse = JSON.parse(jsonMatch[0])
              this.logger.log('Respuesta parseada usando regex')
              this.logger.log(
                'Nombre del curso generado:',
                regexParsedResponse.courseName,
              )
              return regexParsedResponse
            } else {
              this.logger.error('No se encontró JSON con regex')
            }
          } catch (regexParseError) {
            this.logger.error('=== ERROR EN PARSING CON REGEX ===')
            this.logger.error('Error en parsing con regex:', regexParseError)
            this.logger.error('Mensaje de error:', regexParseError.message)
            this.logger.error('=== FIN ERROR REGEX ===')
          }

          this.logger.warn('Usando fallback debido a error de parsing')
          this.logger.warn('Parámetros recibidos:', {
            courseDescription,
            courseDetails,
            userDuration,
            userModality,
            userLevel,
            positions,
            areas,
          })

          // En lugar de lanzar error, usar fallback
          const fallbackResponse = this.createFallbackResponse(
            courseDescription,
            userDuration,
            userModality,
            courseDetails,
            positions,
            areas,
          )

          this.logger.log(
            'Fallback - Número de temas generados:',
            fallbackResponse.content?.length || 0,
          )
          this.logger.log(
            'Fallback - Temas generados:',
            fallbackResponse.content?.map((t) => t.tema) || [],
          )

          return fallbackResponse
        }
      }
    } catch (error) {
      this.logger.error('Error al generar contenido del curso:', error)
      this.logger.warn('Usando fallback debido a error general')
      this.logger.warn('Parámetros recibidos:', {
        courseDescription,
        courseDetails,
        userDuration,
        userModality,
        userLevel,
        positions,
        areas,
      })
      // En lugar de lanzar error, usar fallback
      return this.createFallbackResponse(
        courseDescription,
        userDuration,
        userModality,
        courseDetails,
        positions,
        areas,
      )
    }
  }

  private createFallbackAnalysisResponse(requirements: string): any {
    this.logger.warn(
      'Usando respuesta de análisis de fallback debido a error en OpenAI',
    )

    return {
      cursosRecomendados: [
        {
          nombre: 'Curso básico de formación',
          relevancia: 'alta',
          justificacion:
            'Cubre los fundamentos necesarios para los requerimientos especificados',
        },
      ],
      duracionEstimada: '8 horas',
      modalidadRecomendada: 'presencial',
      observaciones:
        'Se recomienda evaluar necesidades específicas para personalizar el contenido',
    }
  }

  async analyzeCourseRequirements(requirements: string): Promise<any> {
    try {
      const prompt = `
        Analiza los siguientes requerimientos de curso y proporciona recomendaciones:
        
        Requerimientos: ${requirements}
        
        Genera un análisis en formato JSON con:
        {
          "cursosRecomendados": [
            {
              "nombre": "Nombre del curso",
              "relevancia": "alta/media/baja",
              "justificacion": "Por qué es relevante"
            }
          ],
          "duracionEstimada": "X horas",
          "modalidadRecomendada": "presencial/virtual/hibrido",
          "observaciones": "Observaciones adicionales"
        }
        
        IMPORTANTE: Responde ÚNICAMENTE en formato JSON, sin texto adicional antes o después.
      `

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Eres un consultor experto en formación corporativa. Analiza requerimientos y proporciona recomendaciones precisas. Responde ÚNICAMENTE en formato JSON válido, sin texto adicional.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.6,
        max_tokens: 800,
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        this.logger.warn(
          'No se recibió respuesta de análisis de OpenAI, usando fallback',
        )
        return this.createFallbackAnalysisResponse(requirements)
      }

      // Log de la respuesta para debugging
      this.logger.debug('Respuesta de análisis de OpenAI:', response)

      // Intentar limpiar la respuesta antes de parsear
      let cleanedResponse = response.trim()

      // Buscar el inicio del JSON
      const jsonStart = cleanedResponse.indexOf('{')
      const jsonEnd = cleanedResponse.lastIndexOf('}')

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1)
      }

      try {
        return JSON.parse(cleanedResponse)
      } catch (parseError) {
        this.logger.error('Error al parsear análisis de OpenAI:', parseError)
        this.logger.error('Respuesta original:', response)
        this.logger.error('Respuesta limpia:', cleanedResponse)

        // En lugar de lanzar error, usar fallback
        return this.createFallbackAnalysisResponse(requirements)
      }
    } catch (error) {
      this.logger.error('Error al analizar requerimientos:', error)
      // En lugar de lanzar error, usar fallback
      return this.createFallbackAnalysisResponse(requirements)
    }
  }

  async generateQuotationSummary(quotationData: any): Promise<string> {
    try {
      const prompt = `
        Genera un resumen ejecutivo de la siguiente cotización de curso:
        
        Datos de la cotización:
        - Curso: ${quotationData.courseName || 'No especificado'}
        - Participantes: ${quotationData.numberOfPeople || 'No especificado'}
        - Duración: ${quotationData.duration || 'No especificado'}
        - Modalidad: ${quotationData.modality || 'No especificado'}
        - Ubicación: ${quotationData.location || 'No especificado'}
        - Precio: $${quotationData.priceUSD || 0} USD
        
        Genera un resumen profesional de máximo 200 palabras que incluya el precio calculado.
      `

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Eres un experto en redacción de documentos ejecutivos. Genera resúmenes claros y profesionales que incluyan información de precios.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      })

      return (
        completion.choices[0]?.message?.content ||
        'No se pudo generar el resumen'
      )
    } catch (error) {
      this.logger.error('Error al generar resumen de cotización:', error)
      throw new Error(`Error al generar resumen: ${error.message}`)
    }
  }
}
