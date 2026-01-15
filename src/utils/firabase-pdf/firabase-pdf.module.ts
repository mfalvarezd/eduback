import { Module } from '@nestjs/common'
import { FirebasePdfService } from './firabase-pdf.service'

@Module({
  providers: [FirebasePdfService],
  exports: [FirebasePdfService],
})
export class FirebasePdfModule {}
