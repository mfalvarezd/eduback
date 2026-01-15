import { Module } from '@nestjs/common'
import { CollaboratorService } from './collaborator.service'
import { PrismaModule } from 'prisma/prisma.module'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { MailModule } from 'src/modules/mail/mail.module'
import { CollaboratorController } from './collaborator.controller'

@Module({
  imports: [PrismaModule, EncryptionModule, MailModule],
  controllers: [CollaboratorController],
  providers: [CollaboratorService],
  exports: [CollaboratorService],
})
export class CollaboratorModule {}
