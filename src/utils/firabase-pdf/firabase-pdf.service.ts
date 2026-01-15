import { Injectable, Logger } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { ServiceAccount } from 'firebase-admin'

const logger = new Logger('FirebasePdfService')

if (!admin.apps.some((app) => app && app.name === 'storage-pdf')) {
  const missingEnv: string[] = []
  const envMap = {
    FIREBASE_PROJECT_ID_PDF: process.env.FIREBASE_PROJECT_ID_PDF,
    FIREBASE_PRIVATE_KEY_PDF: process.env.FIREBASE_PRIVATE_KEY_PDF,
    FIREBASE_CLIENT_EMAIL_PDF: process.env.FIREBASE_CLIENT_EMAIL_PDF,
    FIREBASE_STORAGE_BUCKET_PDF: process.env.FIREBASE_STORAGE_BUCKET_PDF,
  }
  for (const [key, value] of Object.entries(envMap)) {
    if (!value || String(value).trim() === '') missingEnv.push(key)
  }
  if (missingEnv.length) {
    logger.error(
      `Variables de entorno faltantes para Firebase PDF: ${missingEnv.join(', ')}`,
    )
    throw new Error(
      `Config Firebase PDF incompleta. Faltan: ${missingEnv.join(', ')}`,
    )
  }
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID_PDF as string,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY_PDF as string)
      .split(String.raw`\n`)
      .join('\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL_PDF as string,
  }

  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET_PDF,
    },
    'storage-pdf', // Nombre único para la instancia de PDFs
  )
}
@Injectable()
export class FirebasePdfService {
  private bucket = admin.app('storage-pdf').storage().bucket()
  private folder = 'dashboard_pdf'

  async uploadPdf(pdf: Express.Multer.File): Promise<string> {
    // Suponemos en este punto que el archivo pdf ya está disponible como Express.Multer.File
    const fileName = `${this.folder}/${Date.now()}_${pdf.originalname}`
    const file = this.bucket.file(fileName)

    await file.save(pdf.buffer, {
      metadata: {
        contentType: pdf.mimetype,
      },
      public: true,
    })

    // Retorna la URL pública del archivo subido
    return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`
  }

  async uploadPdfBuffer(
    buffer: Buffer,
    params: { userId: string; quotationId: string; fileName?: string },
  ): Promise<string> {
    const safeFileName = (params.fileName || `cotizacion-${Date.now()}.pdf`)
      .replace(/[^a-zA-Z0-9.-]/g, '-')
      .replace(/-+/g, '-')
    const filePath = `${params.userId}/${params.quotationId}/${safeFileName}`
    const file = this.bucket.file(filePath)

    await file.save(buffer, {
      metadata: {
        contentType: 'application/pdf',
      },
      public: true,
    })

    return `https://storage.googleapis.com/${this.bucket.name}/${filePath}`
  }
}
