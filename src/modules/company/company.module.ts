import { Module } from '@nestjs/common'
import { CompanyController } from './company.controller'
import { CompanyService } from './company.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { UsersModule } from '../users/users.module'
import { StorageService } from 'src/storage/storage.service'
import { SettingsModule } from '../settings/settings.module'
import { MailService } from '../mail/mail.service'

@Module({
  imports: [EncryptionModule, UsersModule, SettingsModule],
  controllers: [CompanyController],
  providers: [CompanyService, StorageService, MailService],
  exports: [CompanyService],
})
export class CompanyModule {}
