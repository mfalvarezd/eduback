import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc'
  private readonly secretKey: Buffer

  constructor() {
    this.secretKey = crypto.pbkdf2Sync(
      process.env.ENCRYPTION_KEY || 'my-super-secret-key-123456789012',
      process.env.SALT || 'my-super-secret-Salt-123456789012',
      10000,
      32,
      'sha256',
    )
  }

  encrypt(data: any): string | any {
    if (process.env.NODE_ENV !== 'production') {
      return data
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv)

    let encrypted = cipher.update(JSON.stringify(data), 'utf-8', 'hex')
    encrypted += cipher.final('hex')

    return `${iv.toString('hex')}:${encrypted}`
  }

  decrypt(encryptedData: string): any {
    if (process.env.NODE_ENV !== 'production') {
      return encryptedData
    }

    const [ivHex, encryptedText] = encryptedData.split(':')
    if (!ivHex || !encryptedText) {
      throw new Error('Invalid encrypted data format')
    }

    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, iv)

    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8')
    decrypted += decipher.final('utf-8')

    return JSON.parse(decrypted)
  }
}
