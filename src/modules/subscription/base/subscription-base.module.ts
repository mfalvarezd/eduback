export class BaseModule {}
import { Module } from '@nestjs/common'
import { SubscriptionBaseController } from './subscription-base.controller'
import { SubscriptionBaseService } from './subscription-base.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [SubscriptionBaseController],
  providers: [SubscriptionBaseService],
  exports: [SubscriptionBaseService],
})
export class SubscriptionBaseModule {}
