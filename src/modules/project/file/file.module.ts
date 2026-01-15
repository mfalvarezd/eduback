import { Module } from '@nestjs/common'
import { FileController } from './file.controller'
import { FileService } from './file.service'
//import { CollaboratorService } from '../collaborator/collaborator.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { PrismaModule } from 'prisma/prisma.module'
import { StorageService } from 'src/storage/storage.service'
import { DocumentService } from 'src/storage/document.service'
//import { CollaboratorModule } from '../collaborator/collaborator.module'
//import { MailModule } from 'src/modules/mail/mail.module'

@Module({
  imports: [EncryptionModule, PrismaModule],//, CollaboratorModule, MailModule],
  controllers: [FileController],
  providers: [
    FileService,
    StorageService,
    DocumentService,
  ],//CollaboratorService,],
  exports: [FileService],//, CollaboratorService],
})
export class FileModule {}
