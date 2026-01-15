import { Module } from '@nestjs/common'
import { UserProviderController } from './user-provider.controller'
import { UserProviderService } from './user-provider.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [UserProviderController],
  providers: [UserProviderService],
  exports: [UserProviderService],
})
export class UserProviderModule {}
