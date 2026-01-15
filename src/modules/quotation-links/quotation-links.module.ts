import { Module } from '@nestjs/common'
import { QuotationLinksController } from './quotation-links.controller'
import { QuotationLinksService } from './quotation-links.service'
import { PrismaModule } from '../../../prisma/prisma.module'
import { PdfModule } from '../pdf/pdf.module'
import { FirebasePdfModule } from '../../utils/firabase-pdf/firabase-pdf.module'

@Module({
  imports: [PrismaModule, PdfModule, FirebasePdfModule],
  controllers: [QuotationLinksController],
  providers: [QuotationLinksService],
  exports: [QuotationLinksService],
})
export class QuotationLinksModule {}
