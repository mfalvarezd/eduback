import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { CreateSubscriptionBaseDto } from './dto/create-subscription-base.dto'
import { UpdateSubscriptionBaseDto } from './dto/update-subscription-base.dto'
import { EncryptionService } from 'src/utils/encryption/encryption.service'
import Stripe from 'stripe'
import { STRIPE_PRODUCT_MAPPING } from 'src/modules/payments/products/productListId'
import {
  productToPriceID,
  productToPriceIDAnnually,
} from 'src/modules/payments/products/productListId'

@Injectable()
export class SubscriptionBaseService {
  private prisma = new PrismaClient()
  private stripe: Stripe

  constructor(private encryptionService: EncryptionService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    })
  }

  async getSubscriptionBaseById(id: string) {
    try {
      const subscription = await this.prisma.subscriptionBase.findUnique({
        where: { id },
        include: {
          plan: true,
          user: { select: { id: true, email: true } },
          group: true,
        },
      })

      if (!subscription) {
        throw new NotFoundException(`Subscription with ID: '${id}' not found`)
      }

      const encryptedResponse = this.encryptionService.encrypt(subscription)
      return { encryptedResponse }
    } catch (error) {
      if (error.status === 404) {
        throw new NotFoundException(error.message)
      }

      throw new InternalServerErrorException('Error retrieving subscription')
    }
  }

  async getActiveSubscriptionByUser(userId: string) {
    try {
      const subscription = await this.prisma.subscriptionBase.findFirst({
        where: {
          userId: userId,
          status: 'active',
        },
        include: {
          plan: true,
          user: {
            select: {
              idStripeCustomer: true,
            },
          },
        },
      })

      if (!subscription) {
        return null
      }

      let periodo = 'No disponible'
      let cantidad = 1
      let priceId: string | null = null
      let aplicacion = 'No disponible'
      let tipoPlan = 'No disponible'
      let precioUnitario = 0
      let startDate: string | null = null

      if (subscription.user?.idStripeCustomer) {
        try {
          const stripeSubscriptions = await this.stripe.subscriptions.list({
            customer: subscription.user.idStripeCustomer,
            status: 'active',
            limit: 1,
            expand: ['data.plan'],
          })

          if (stripeSubscriptions.data.length > 0) {
            const stripeSub = stripeSubscriptions.data[0]
            if (
              stripeSub.items.data.length > 0 &&
              stripeSub.items.data[0].plan
            ) {
              const plan = stripeSub.items.data[0].plan
              periodo =
                plan.interval === 'month'
                  ? 'Mensual'
                  : plan.interval === 'year'
                    ? 'Anual'
                    : 'Otro'

              cantidad = stripeSub.items.data[0].quantity || 1
              priceId = stripeSub.items.data[0].price.id

              precioUnitario = plan.amount ? plan.amount / 100 : 0

              startDate = stripeSub.start_date
                ? new Date(stripeSub.start_date * 1000).toISOString()
                : null

              for (const [product, price] of Object.entries(productToPriceID)) {
                if (price === priceId) {
                  const partes = product.split('-')
                  aplicacion = partes[0] || 'No disponible'
                  tipoPlan = STRIPE_PRODUCT_MAPPING[product] || 'No disponible'
                  break
                }
              }

              if (aplicacion === 'No disponible' && periodo === 'Anual') {
                for (const [product, price] of Object.entries(
                  productToPriceIDAnnually,
                )) {
                  if (price === priceId) {
                    const partes = product.split('-')
                    aplicacion = partes[0] || 'No disponible'
                    tipoPlan =
                      STRIPE_PRODUCT_MAPPING[product] || 'No disponible'
                    break
                  }
                }
              }
            }
          }
        } catch (stripeError) {
          console.error(
            'Error al obtener información de Stripe:',
            stripeError.message,
          )
        }
      }

      return {
        ...subscription,
        periodo: periodo,
        cantidad: cantidad,
        priceId: priceId,
        aplicacion: aplicacion,
        tipoPlan: tipoPlan,
        precioUnitario: precioUnitario,
        startDate: startDate,
      }
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving subscription')
    }
  }
}
