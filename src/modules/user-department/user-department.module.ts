import { Module } from '@nestjs/common'
import { UserDepartmentService } from './user-department.service'
import { UserDepartmentController } from './user-department.controller'
import { PrismaModule } from 'prisma/prisma.module'
import { StorageService } from 'src/storage/storage.service'
import { UserCompanyController } from './user-company.controller'

@Module({
  imports: [PrismaModule],
  providers: [UserDepartmentService, StorageService],
  controllers: [UserDepartmentController, UserCompanyController],
})
export class UserDepartmentModule {}
