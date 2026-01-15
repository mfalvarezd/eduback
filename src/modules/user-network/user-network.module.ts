import { Module } from '@nestjs/common';
import { UserNetworkController } from './user-network.controller'
import { UserNetworkService } from './user-network.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [UserNetworkController],
  providers: [UserNetworkService],
  exports: [UserNetworkService],
})
export class UserNetworkModule {}
