import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { PrismaModule } from '../../../prisma/prisma.module'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { FirebaseModule } from 'src/utils/firebase-img/firebase-image.module'

@Module({
  imports: [PrismaModule, EncryptionModule, FirebaseModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
