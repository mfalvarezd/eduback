import { Injectable } from '@nestjs/common'
import * as admin from 'firebase-admin'
import { ServiceAccount } from 'firebase-admin'

if (!admin.apps.some((app) => app && app.name === 'storage')) {
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID_IMG,
    privateKey: process.env.FIREBASE_PRIVATE_KEY_IMG
      ? process.env.FIREBASE_PRIVATE_KEY_IMG.split(String.raw`\n`).join('\n') // Usamos split y join
      : '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL_IMG,
  }

  admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET_IMG,
    },
    'storage', // Nombre único para la instancia
  )
}

@Injectable()
export class FirebaseImagesService {
  private bucket = admin.app('storage').storage().bucket()
  // Define el nombre de la carpeta donde se guardarán las imágenes
  private folder = 'dashboard_test'

  async uploadImage(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new Error('No file provided')
    }

    // Incluye la carpeta en el nombre del archivo
    const filename = `${this.folder}/${userId}-${Date.now()}-${file.originalname}`
    const fileUpload = this.bucket.file(filename)

    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    })

    return new Promise<string>((resolve, reject) => {
      stream.on('error', (err) => {
        console.error('Error uploading file to Firebase:', err)
        reject(new Error('Error uploading file'))
      })

      stream.on('finish', async () => {
        await fileUpload.makePublic()

        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${filename}`
        console.log(`File uploaded to Firebase: ${publicUrl}`)
        resolve(publicUrl)
      })

      stream.end(file.buffer)
    })
  }

  async deleteImage(imageUrl: string) {
    if (!imageUrl) {
      throw new Error('No image URL provided')
    }

    // Extrae el filename completo (incluyendo la carpeta)
    const bucketUrl = `https://storage.googleapis.com/${this.bucket.name}/`
    if (!imageUrl.startsWith(bucketUrl)) {
      throw new Error('Invalid image URL')
    }
    const filename = imageUrl.substring(bucketUrl.length)

    try {
      await this.bucket.file(filename).delete()
      console.log(`File deleted from Firebase: ${filename}`)
    } catch (err) {
      console.error('Error deleting file from Firebase:', err)
      throw new Error('Error deleting file')
    }
  }
}
