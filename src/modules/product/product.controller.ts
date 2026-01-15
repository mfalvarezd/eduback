import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common'
import { ProductService } from './product.service'
import { RegisterProductDto } from './dto/register.product.dto'
import { UpdateProductDto } from './dto/update.product.dto'
import { AuthGuard } from '@nestjs/passport'
import { ClientInfo } from 'src/utils/client-info'
import { companyProductLogger } from 'src/utils/logger'

@Controller('products')
export class ProductController {
  constructor(private productService: ProductService) {}

  @Post('create')
  async createProduct(
    @Body() registerProductDto: RegisterProductDto,
    @Req() req: Request,
  ) {
    const { userId } = registerProductDto

    // Pasa el objeto req correctamente a getClientInfo
    const clientInfo = ClientInfo.getClientInfo(req)

    companyProductLogger.info(`Starting product creation`, {
      metadata: {
        ...clientInfo,
        action: 'CREATE_PRODUCT',
      },
      request: {
        ...registerProductDto,
      },
    })

    const result = await this.productService.createProduct(
      registerProductDto,
      userId,
    )

    companyProductLogger.info(`Product created successfully`, {
      metadata: {
        ...clientInfo,
        action: 'CREATE_PRODUCT_SUCCESS',
      },
      response: {
        productId: result.encryptedResponse.newProduct?.id,
        userId: result.encryptedResponse.newProduct?.company?.userId,
      },
    })

    return result
  }

  @Get()
  async getAllProducts(@Request() req) {
    companyProductLogger.info(`Requesting all products`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_PRODUCTS',
      },
    })

    const result = await this.productService.getAllProducts()

    companyProductLogger.info(`Products retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_ALL_PRODUCTS_SUCCESS',
      },
      response: {
        count: result.encryptedResponse.length,
      },
    })

    return result
  }

  @Get(':id')
  async getProductById(@Param('id') id: string, @Request() req) {
    companyProductLogger.info(`Requesting product by ID`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_PRODUCT',
      },
      request: {
        productId: id,
      },
    })

    const result = await this.productService.getProductById(id)

    companyProductLogger.info(`Product retrieved successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'GET_PRODUCT_SUCCESS',
      },
      response: {
        productId: result.encryptedResponse.id,
        userId: result.encryptedResponse.company.userId,
      },
    })

    return result
  }

  @Post('update/:id')
  @UseGuards(AuthGuard('jwt'))
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Request() req,
  ) {
    companyProductLogger.info(`Starting product update`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_PRODUCT',
      },
      request: {
        productId: id,
        ...updateProductDto,
      },
    })

    const result = await this.productService.updateProduct(id, updateProductDto)

    companyProductLogger.info(`Product updated successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'UPDATE_PRODUCT_SUCCESS',
      },
      response: {
        productId: result.encryptedResponse.id,
        userId: result.encryptedResponse.product.company.userId,
      },
    })

    return result
  }

  @Post('delete/:id')
  @UseGuards(AuthGuard('jwt'))
  async deleteProduct(@Param('id') id: string, @Request() req) {
    companyProductLogger.info(`Starting product deletion`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_PRODUCT',
      },
      request: {
        productId: id,
      },
    })

    const result = await this.productService.deleteProduct(id)

    companyProductLogger.info(`Product deleted successfully`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'DELETE_PRODUCT_SUCCESS',
      },
      response: {
        productId: id,
        message: 'Product deleted successfully',
      },
    })

    return result
  }
}
