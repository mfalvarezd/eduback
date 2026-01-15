import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { RegisterProductDto } from './dto/register.product.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import { UpdateProductDto } from './dto/update.product.dto'

@Injectable()
export class ProductService {
  private prisma = new PrismaClient()

  constructor(private encryptionService: EncryptionService) {}

  async createProduct(data: RegisterProductDto, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required')
      }
      if (!data.product) {
        throw new BadRequestException('Product name is required')
      }

      const { product } = data

      const userCompany = await this.prisma.company.findUnique({
        where: { userId: userId },
      })

      if (!userCompany) {
        throw new BadRequestException(
          `User with ID ${userId} does not have a company`,
        )
      }

      const companyId = userCompany.id

      const companyExists = await this.prisma.company.findUnique({
        where: { id: companyId },
      })

      if (!companyExists) {
        throw new BadRequestException(
          `Company with ID ${companyId} does not exist`,
        )
      }

      const existingProduct = await this.prisma.companyProducts.findFirst({
        where: { 
          product: product,
          companyId: companyId
        },
      })

      if (existingProduct) {
        throw new ConflictException(
          `A product with name '${product}' already exists in user's company`,
        )
      }

      const newProduct = await this.prisma.companyProducts.create({
        data: {
          product,
          companyId,
        },
        include: {
          company: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Product created successfully',
        newProduct,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      if (error.status === 409) {
        throw new ConflictException(error.message)
      }
      throw new InternalServerErrorException('Error creating product')
    }
  }

  async getAllProducts() {
    try {
      const products = await this.prisma.companyProducts.findMany({
        include: {
          company: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt(products)
      return { encryptedResponse }
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving products')
    }
  }

  async getProductById(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Product ID is required')
      }

      const product = await this.prisma.companyProducts.findUnique({
        where: { id },
        include: {
          company: true,
        },
      })

      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found`)
      }

      const encryptedResponse = this.encryptionService.encrypt(product)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error retrieving product')
    }
  }

  async updateProduct(productId: string, updateData: UpdateProductDto) {
    try {
      if (!productId) {
        throw new BadRequestException('Product ID is required')
      }
      if (updateData.product === null) {
        throw new BadRequestException(`Product can't be send as null`)
      }

      const product = await this.prisma.companyProducts.findUnique({
        where: { id: productId },
      })

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`)
      }

      const updatedProduct = await this.prisma.companyProducts.update({
        where: { id: productId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          company: true,
        },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Product updated successfully',
        product: updatedProduct,
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error updating product')
    }
  }

  async deleteProduct(productId: string) {
    try {
      if (!productId) {
        throw new BadRequestException('Product ID is required')
      }

      const product = await this.prisma.companyProducts.findUnique({
        where: { id: productId },
      })

      if (!product) {
        throw new NotFoundException(`Product with ID ${productId} not found`)
      }

      await this.prisma.companyProducts.delete({
        where: { id: productId },
      })

      const encryptedResponse = this.encryptionService.encrypt({
        message: 'Product deleted successfully',
      })

      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }
      if (error.status === 400) {
        throw new BadRequestException(error.message)
      }
      throw new InternalServerErrorException('Error deleting product')
    }
  }
}
