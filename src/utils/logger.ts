import * as winston from 'winston'
import admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as Transport from 'winston-transport'
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dotenv.config()
dayjs.extend(utc)
dayjs.extend(timezone)

if (!admin.apps.some((app) => app && app.name === 'firestore')) {
  admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
          : '',
      }),
    },
    'firestore', // Nombre único para la instancia
  )
}

const db = admin.app('firestore').firestore()

interface FirestoreTransportOptions extends Transport.TransportStreamOptions {
  collection: string
}

class FirestoreTransport extends Transport {
  private collectionRef: FirebaseFirestore.CollectionReference

  constructor(opts: FirestoreTransportOptions) {
    super(opts)
    console.log(
      `Inicializando FirestoreTransport con la colección ${opts.collection}`,
    )
    this.collectionRef = db.collection(opts.collection)
  }

  private sanitizeData(obj: any): any {
    if (obj === undefined) {
      return null
    }

    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeData(item))
    }

    const result = {}
    Object.keys(obj).forEach((key) => {
      result[key] = this.sanitizeData(obj[key])
    })

    return result
  }

  async log(info: any, callback: (error?: any) => void) {
    setImmediate(() => this.emit('logged', info))
    try {
      const sanitizedInfo = this.sanitizeData(info)
      const timestamp = dayjs()
        .tz('America/Guayaquil')
        .format('YYYY-MM-DD HH:mm:ss')
      const docName = `[${timestamp}] [${info.level.toUpperCase()}]`
      await this.collectionRef.doc(docName).set(sanitizedInfo)
      callback()
    } catch (err) {
      console.error('Firestore Transport Error:', err)
      callback(err as any)
    }
  }
}

const createLogger = (collection: string) => {
  const transports: any[] = []

  // Temporalmente deshabilitado FirestoreTransport hasta que se renueve la cuota
  // if (process.env.NODE_ENV === 'production') {
  //   transports.push(new FirestoreTransport({ collection }))
  // }

  // Solo usar console por ahora
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  )

  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
    ),
    transports,
  })
}

export const userLogger = createLogger('user_logs')
export const projectLogger = createLogger('project_logs')
export const groupLogger = createLogger('group_logs')
export const folderLogger = createLogger('folder_logs')
export const subscriptionBaseLogger = createLogger('subscription_base_logs')
export const planLogger = createLogger('plan_logs')
export const subscriptionGroupLogger = createLogger('subscription_group_logs')
export const canvasLogger = createLogger('canvas_logs')
export const companyLogger = createLogger('company_logs')
export const settingsLogger = createLogger('settings_logs')
export const companyProductLogger = createLogger('company_product_logs')
export const userProviderLogger = createLogger('user_provider_logs')
export const paymentLogger = createLogger('payment_logs')
