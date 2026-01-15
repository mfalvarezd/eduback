import { Module } from '@nestjs/common'
import { ProductController } from './product.controller'
import { ProductService } from './product.service'
import { EncryptionModule } from 'src/utils/encryption/encryption.module'

@Module({
  imports: [EncryptionModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
