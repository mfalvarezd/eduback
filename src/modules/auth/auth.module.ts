import { Module } from '@nestjs/common'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { UsersModule } from '../users/users.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { PrismaModule } from '../../../prisma/prisma.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtStrategyAccess } from './strategy/jwt-access.strategy'
import { JwtStrategyRefresh } from './strategy/jwt-refresh.strategy'
import { GoogleStrategy } from './strategy/google.strategy'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'
import { MailModule } from '../mail/mail.module'
import { StorageService } from 'src/storage/storage.service'
import { SettingsModule } from '../settings/settings.module'
import { TwilioService } from '../twilio/twilio.service'
import { DeviceHistoryService } from '../device-history/device-history.service'

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    MailModule,
    SettingsModule,
    ConfigModule.forRoot(),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        global: true,
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    EncryptionModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategyAccess,
    JwtStrategyRefresh,
    GoogleStrategy,
    StorageService,
    TwilioService,
    DeviceHistoryService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
