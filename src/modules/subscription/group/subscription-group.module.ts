import { Module } from '@nestjs/common'
import { SubscriptionGroupController } from './subscription-group.controller'
import { SubscriptionGroupService } from './subscription-group.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [SubscriptionGroupController],
  providers: [SubscriptionGroupService],
  exports: [SubscriptionGroupService],
})
export class SubscriptionGroupModule {}
