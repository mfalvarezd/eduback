import { Module } from '@nestjs/common'
import { BillsController } from './bills.controller'
import { BillsService } from './bills.service'
import { PrismaModule } from 'prisma/prisma.module'
import { MailService } from '../mail/mail.service'

@Module({
  controllers: [BillsController],
  providers: [BillsService, MailService],
  imports: [PrismaModule],
})
export class BillsModule {}
