import { Controller, Get, Post, Body } from '@nestjs/common'
import { EncryptionService } from './encryption.service'

@Controller('encryption')
export class EncryptionController {
  constructor(private readonly encryptionService: EncryptionService) {}

  @Post('encrypt')
  encrypt(@Body('data') data: any) {
    const encryptedData = this.encryptionService.encrypt(data)
    return { encrypted: encryptedData }
  }

  @Post('decrypt')
  decrypt(@Body('data') encryptedData: string) {
    const decryptedData = this.encryptionService.decrypt(encryptedData)
    return decryptedData
  }

  @Get('test-response')
  testEncryptedResponse() {
    const response = { message: 'Esta es una respuesta encriptada del backend' }
    return { encrypted: this.encryptionService.encrypt(response) }
  }
}
