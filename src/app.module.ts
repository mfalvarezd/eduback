import { MiddlewareConsumer, Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { UsersModule } from './modules/users/users.module'
import { AuthModule } from './modules/auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from 'prisma/prisma.module'
import { CsrfModule } from './modules/middleware/csrf/csrf.module'
import { CompanyModule } from './modules/company/company.module'
import { GroupUserModule } from './modules/group-user/group-user.module'
import { PlanModule } from './modules/plan/plan.module'
import { ProductModule } from './modules/product/product.module'
import { SettingsModule } from './modules/settings/settings.module'
import { SubscriptionBaseModule } from './modules/subscription/base/subscription-base.module'
import { SubscriptionGroupModule } from './modules/subscription/group/subscription-group.module'
import { UserProviderModule } from './modules/user-provider/user-provider.module'
import { EncryptionModule } from './utils/encryption/encryption.module'
import { TokenMiddleware } from './modules/middleware/token/token.middleware'
import { UserNetworkModule } from './modules/user-network/user-network.module'
import { UserDeviceModule } from './modules/user-device/user-device.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { MailService } from './modules/mail/mail.service'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { CompanyDepartmentModule } from './modules/company-department/company-department.module'
import { UserDepartmentModule } from './modules/user-department/user-department.module'
import { NotificationModule } from './modules/notification/notification.module'
import { DeviceHistoryModule } from './modules/device-history/device-history.module'
import { BillsModule } from './modules/bills/bills.module'
import { FileModule } from './modules/project/file/file.module'
import { FolderModule } from './modules/project/folder/folder.module'
import { CollaboratorModule } from './modules/project/collaborator/collaborator.module'
import { OpenaiModule } from './modules/openai/openai.module'
import { QuoterModule } from './modules/quoter/quoter.module'
import { PdfModule } from './modules/pdf/pdf.module'
import { QuotationLinksModule } from './modules/quotation-links/quotation-links.module'

@Module({
  imports: [
    CsrfModule,
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    CompanyModule,
    FolderModule,
    GroupUserModule,
    PlanModule,
    ProductModule,
    SettingsModule,
    SubscriptionBaseModule,
    SubscriptionGroupModule,
    UserProviderModule,
    UserNetworkModule,
    EncryptionModule,
    UserDeviceModule,
    PaymentsModule,
    FileModule,
    CollaboratorModule,
    OpenaiModule,
    QuoterModule,
    PdfModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/assets',
    }),
    CompanyDepartmentModule,
    UserDepartmentModule,
    NotificationModule,
    DeviceHistoryModule,
    BillsModule,
    QuotationLinksModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TokenMiddleware)
      .exclude(
        '/auth/login',
        '/auth/register',
        '/auth/google',
        '/auth/google/finalize',
        '/auth/verify-code',
        '/auth/send-verification-code',
        '/auth/google/callback',
        '/auth/refresh',
        '/static/(.*)',
        '/payments/success',
        '/payments/cancel',
        '/payments/webhook',
        '/companies/create',
        '/products/create',
        '/auth/logout',
        '/auth/reset-password',
        '/auth/invite-login',
        '/quotation-links/pdf/(.*)',
        '/quotation-links/public/(.*)',
      )
      .forRoutes('*')
  }
}
