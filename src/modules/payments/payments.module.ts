import { Module } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { PaymentsController } from './payments.controller'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  providers: [PaymentsService],
  controllers: [PaymentsController],
  imports: [PrismaModule, ConfigModule],
  exports: [PaymentsService],
})
export class PaymentsModule {}
