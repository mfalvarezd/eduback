import { Module } from '@nestjs/common'
import { UserDeviceController } from './user-device.controller'
import { UserDeviceService } from './user-device.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [EncryptionModule, PrismaModule],
  controllers: [UserDeviceController],
  providers: [UserDeviceService],
  exports: [UserDeviceService],
})
export class UserDeviceModule {}
