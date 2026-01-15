import { Module } from '@nestjs/common'
import { QuoterController } from './quoter.controller'
import { QuoterService } from './quoter.service'
import { OpenaiModule } from '../openai/openai.module'
import { PrismaModule } from '../../../prisma/prisma.module'

@Module({
  imports: [OpenaiModule, PrismaModule],
  controllers: [QuoterController],
  providers: [QuoterService],
  exports: [QuoterService],
})
export class QuoterModule {}
