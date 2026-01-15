import { Module } from '@nestjs/common'
import { GroupUserController } from './group-user.controller'
import { GroupUserService } from './group-user.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [GroupUserController],
  providers: [GroupUserService],
  exports: [GroupUserService],
})
export class GroupUserModule {}
