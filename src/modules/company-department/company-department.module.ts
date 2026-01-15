import { Module } from '@nestjs/common'
import { CompanyDepartmentService } from './company-department.service'
import { CompanyDepartmentController } from './company-department.controller'
import { PrismaModule } from 'prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CompanyDepartmentController],
  providers: [CompanyDepartmentService],
})
export class CompanyDepartmentModule {}
