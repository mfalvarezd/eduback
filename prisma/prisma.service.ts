import {
  INestApplication,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    console.log('[Prisma] Conectando a la base de datos...')
    await this.$connect()
  }

  async onModuleDestroy() {
    console.log('[Prisma] Desconectando base de datos...')
    await this.$disconnect()
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      console.log('[Prisma] Cerrando conexión antes de salir...')
      await this.$disconnect()
    })
  }
}
