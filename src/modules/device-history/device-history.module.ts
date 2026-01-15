import { Module } from '@nestjs/common';
import { DeviceHistoryController } from './device-history.controller'
import { DeviceHistoryService } from './device-history.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [EncryptionModule, PrismaModule],
  controllers: [DeviceHistoryController],
  providers: [DeviceHistoryService],
  exports: [DeviceHistoryService],
})
export class DeviceHistoryModule {}
