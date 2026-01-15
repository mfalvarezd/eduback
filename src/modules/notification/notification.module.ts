import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller'
import { NotificationService } from './notification.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [EncryptionModule, PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}

