import { Module } from '@nestjs/common'
import { FolderController } from './folder.controller'
import { FolderService } from './folder.service'
//import { CollaboratorService } from '../collaborator/collaborator.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { PrismaModule } from 'prisma/prisma.module'
import { StorageService } from 'src/storage/storage.service'
//import { CollaboratorModule } from '../collaborator/collaborator.module'
//import { MailModule } from 'src/modules/mail/mail.module'

@Module({
  imports: [EncryptionModule, PrismaModule],//, CollaboratorModule, MailModule],
  controllers: [FolderController],
  providers: [FolderService, StorageService],//, CollaboratorService],
  exports: [FolderService, StorageService],//, CollaboratorService],
})
export class FolderModule {}
