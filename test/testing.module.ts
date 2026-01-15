import { Test } from '@nestjs/testing'
import { ValidationPipe } from '@nestjs/common'
import { INestApplication } from '@nestjs/common'
import { EncryptionService } from '../src/utils/encryption/encryption.service'
import { PrismaService } from '../prisma/prisma.service' //Conecta a la base de datos
import { UsersService } from '../src/modules/users/users.service'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as dotenv from 'dotenv'
import { AuthService } from '../src/modules/auth/auth.service'
import { AuthController } from '../src/modules/auth/auth.controller'
import { TokenMiddleware } from '../src/modules/middleware/token/token.middleware'
import { JwtStrategyRefresh } from '../src/modules/auth/strategy/jwt-refresh.strategy'
import { JwtStrategyAccess } from '../src/modules/auth/strategy/jwt-access.strategy'
import { PassportModule } from '@nestjs/passport'
import * as request from 'supertest'
import { MailService } from '../src/modules/mail/mail.service';
import { FirebaseImagesService } from '../src/utils/firebase-img/firebase-image.service'
import { PrismaClient } from '@prisma/client'
import { StorageService } from '../src/storage/storage.service'
import { DocumentService } from '../src/storage/document.service'
import { SettingsService } from '../src/modules/settings/settings.service'
import { DeviceHistoryService } from '../src/modules/device-history/device-history.service'
//import { TwilioService } from '../src/modules/twilio/twilio.service'

dotenv.config()

var textingModule: { imports: any[]; controllers: any[]; providers: any[] } = {
  imports: [PassportModule, JwtModule],
  controllers: [AuthController],
  providers: [
    UsersService,
    EncryptionService,
    PrismaService,
    JwtService,
    ConfigService,
    AuthService,
    JwtStrategyRefresh,
    JwtStrategyAccess,
    TokenMiddleware,
    MailService,
    FirebaseImagesService,
    StorageService,
    DocumentService,
    SettingsService,
    DeviceHistoryService
    //TwilioService,
  ],
}

export class testingModule{
  private app: INestApplication;
  private authService: AuthService

  private url: string;
  private useTokens = true;

  private accessToken: string;
  private refreshToken: string;

  private prisma = new PrismaClient()

  getApp(){
    return this.app
  }

  getPrisma(){
    return this.prisma
  }

  setParameters(url: string, useTokens: boolean){
    this.setUrl(url)
    this.setUseOfToken(useTokens)
  }

  setUrl(url: string){
    this.url = url
  }

  setUseOfToken(value: boolean){
    this.useTokens = value
  }

  setTokens(user: any){
    this.accessToken = user.accessToken;
    this.refreshToken = user.refreshToken;
  }

  async createApp(moduleController: any, moduleService: any){
    this.addController(moduleController)
    this.addProvider(moduleService)
    await this.initApp()
  }

  addController(moduleController: any){
    textingModule.controllers.push(moduleController)
  }

  addProvider(moduleService: any){
    textingModule.providers.push(moduleService)
  }

  async initApp(){
    const moduleRef = await Test.createTestingModule(textingModule).compile()
    this.app = moduleRef.createNestApplication()
    this.app.useGlobalPipes(new ValidationPipe())
    await this.app.init()
    this.authService = this.app.get<AuthService>(AuthService)
  }

  async closeApp(){
    await this.app.close()
  }

  async createTokens(user: any){
    const userInfo = {sub: user.sub, email: user.email}
    user.accessToken = await this.authService.generateAccessToken(userInfo)
    user.refreshToken = await this.authService.generateRefreshToken(userInfo)
  }

  async postWithUrl(url: string){
    return await request(this.app.getHttpServer()).post(`${url}`)
  }

  async postObject(): Promise<any>;
  async postObject(data: any): Promise<any>;

  async postObject(data?: any){
    if(data !== undefined){
      if(this.useTokens){
        return await request(this.app.getHttpServer())
        .post(`${this.url}`)
        .set('authorization', `Bearer ${this.accessToken}`)
        .set('Cookie', `REFRESH-TOKEN=${this.refreshToken}`)
        .send(data)
      }else{
        return await request(this.app.getHttpServer())
        .post(`${this.url}`)
        .send(data)
      }
    }else{
      if(this.useTokens){
        return await request(this.app.getHttpServer())
        .post(`${this.url}`)
        .set('authorization', `Bearer ${this.accessToken}`)
        .set('Cookie', `REFRESH-TOKEN=${this.refreshToken}`)
      }else{
        return await this.postWithUrl(`${this.url}`)
      }
    }
  }

  async getWithToken(){
    return await request(this.app.getHttpServer())
    .get(`${this.url}`)
    .set('authorization', `Bearer ${this.accessToken}`)
    .set('Cookie', `REFRESH-TOKEN=${this.refreshToken}`)
  }

  async getWithUrl(url: string){
    return await request(this.app.getHttpServer()).get(`${url}`)
  }

  async goodGetWithUrl(url: string){
    const result =  await this.getWithUrl(`${url}`)
    expect(result.status).toBe(200)
    return result
  }

  async esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
