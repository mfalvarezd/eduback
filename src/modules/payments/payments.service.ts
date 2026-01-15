import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import Stripe from 'stripe'
import { paymentLogger } from 'src/utils/logger'
import {
  productToPriceID,
  productToPriceIDAnnually,
} from './products/productListId'
import { createNewCustomer, createCheckoutSession } from './stripe'

import {
  handleSubscriptionScheduleCompleted,
  handleSubscriptionChange,
} from './utils/paymentsFunctions'

@Injectable()
export class PaymentsService {
  private stripe: Stripe

  constructor(private prisma: PrismaService) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is not defined')
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    })
  }

  async createCheckoutSession(
    email: string,
    period: 'mes' | 'año',
    productType: string,
    userCount: number,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } })
      if (!user) throw new BadRequestException('Usuario no encontrado')

      let stripeCustomerId = user.idStripeCustomer
      if (!stripeCustomerId) {
        // stripeId del customer
        const customer = await createNewCustomer(user.email, {
          userId: user.id,
        })
        await this.prisma.user.update({
          where: { id: user.id },
          data: { idStripeCustomer: customer.id },
        })
        stripeCustomerId = customer.id
        paymentLogger.info(`Customer ID creado: ${customer.id}`)
      }

      const priceId =
        period === 'año'
          ? productToPriceIDAnnually[productType]
          : productToPriceID[productType]
      if (!priceId)
        throw new BadRequestException(`Plan no válido: ${productType}`)

      const session = await createCheckoutSession(
        stripeCustomerId,
        priceId,
        user.id,
        period,
        productType,
        userCount,
      )

      return session
    } catch (error) {
      console.log(`Error al crear sesión de pago: ${error.message}`)
      paymentLogger.error(`Error: ${error.message}`)
      throw new BadRequestException('Error al crear sesión de pago')
    }
  }

  async createPortalSession(
    email: string,
    action: 'downgrade' | 'cancel' | 'upgrade',
    selectedProduct: 'emprendedor' | 'pro' | 'corporativo',
    period?: string,
    userCount?: number,
  ) {
    try {
      console.log('Creando sesión de portal para el usuario:', {
        email,
        action,
        selectedProduct,
        period,
        userCount,
      })

      const user = await this.prisma.user.findUnique({ where: { email } })
      if (!user) throw new BadRequestException('Usuario no encontrado')
      if (!user.idStripeCustomer)
        throw new BadRequestException('Sin customer ID')

      // Obtener la suscripción actual del usuario
      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        status: 'active',
        limit: 1,
      })

      if (!subscriptions.data.length) {
        throw new BadRequestException('No se encontraron suscripciones activas')
      }

      const subscriptionId = subscriptions.data[0].id
      const subscriptionItemId = subscriptions.data[0].items.data[0]?.id

      if (!subscriptionItemId) {
        throw new BadRequestException(
          'No se encontró un elemento válido en la suscripción actual',
        )
      }

      let productKey = `etiqueta-${selectedProduct}`

      if (period) {
        const periodKey =
          period.toLowerCase().includes('año') ||
          period.toLowerCase().includes('anual')
            ? 'anual'
            : 'mensual'
        productKey = `${productKey}-${periodKey}`
      }

      const priceId = productToPriceID[productKey]

      if (!priceId) {
        throw new BadRequestException(`Plan no válido: ${productKey}`)
      }

      if (action === 'downgrade') {
        // Crear la sesión del portal para downgrade
        const session = await this.stripe.billingPortal.sessions.create({
          customer: user.idStripeCustomer,
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/return`,
          flow_data: {
            type: 'subscription_update_confirm',
            subscription_update_confirm: {
              subscription: subscriptionId,
              items: [
                {
                  id: subscriptionItemId,
                  price: priceId,
                  quantity: userCount || 1,
                },
              ],
            },
          },
        })

        console.log('URL de la sesión de portal para downgrade:', session.url)
        return session
      } else if (action === 'cancel') {
        const session = await this.stripe.billingPortal.sessions.create({
          customer: user.idStripeCustomer,
          return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payments/return`,
          flow_data: {
            type: 'subscription_cancel',
            subscription_cancel: {
              subscription: subscriptionId,
            },
          },
        })

        console.log('URL de la sesión de portal para cancelación:', session.url)
        return session
      } else {
        throw new BadRequestException('Acción no válida')
      }
    } catch (error) {
      console.log('Error al crear la sesión del portal:', error.message)
      throw new BadRequestException(
        `Error al acceder al portal: ${error.message}`,
      )
    }
  }

  async handleUpgrade(
    email: string,
    period: 'mes' | 'año',
    selectedProduct: 'emprendedor' | 'pro' | 'corporativo',
    userCount: number = 1,
  ) {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } })
      if (!user) throw new BadRequestException('Usuario no encontrado')
      if (!user.idStripeCustomer)
        throw new BadRequestException('Sin customer ID')

      console.log('Usuario encontrado: ', user)

      const productKey = `etiqueta-${selectedProduct}`
      const priceId =
        period === 'año'
          ? productToPriceIDAnnually[productKey]
          : productToPriceID[productKey]

      if (!priceId) {
        throw new BadRequestException(`Plan no válido: ${selectedProduct}`)
      }

      const session = await this.createCheckoutSession(
        email,
        period,
        productKey,
        userCount,
      )

      console.log('URL de la sesión de Checkout para upgrade:', session.url)
      return session
    } catch (error) {
      console.log('Error al manejar el upgrade:', error.message)
      throw new BadRequestException('Error al manejar el upgrade')
    }
  }
  async handleWebhook(request: any, signature: string) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        request,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || '',
      )

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session

          if (
            session.mode === 'subscription' &&
            session.metadata?.productType
          ) {
            paymentLogger.info('Checkout completado', {
              metadata: {
                webhook: 'checkout.session.completed',
                sessionId: session.id,
                customerIdStripe: session.customer,
              },
            })

            const user = await this.prisma.user.findFirst({
              where: { idStripeCustomer: session.customer as string },
            })

            if (user) {
              await this.prisma.subscriptionBase.create({
                data: {
                  userId: user.id,
                  planId: session.metadata.planId,
                  status: 'active',
                  startDate: new Date(),
                },
              })

              paymentLogger.info('Suscripción creada en la base de datos', {
                userId: user.id,
                productType: session.metadata.productType,
              })
            } else {
              paymentLogger.error(
                'Usuario no encontrado para el cliente de Stripe',
                {
                  customerIdStripe: session.customer,
                },
              )
            }
          }
          break

        case 'invoice.paid':
          const invoice = event.data.object as Stripe.Invoice
          const lineItem = invoice.lines?.data[0]
          if (lineItem) {
            const productId =
              typeof lineItem.price?.product === 'string'
                ? lineItem.price.product
                : lineItem.price?.product?.id || 'emprendedor'

            paymentLogger.info('Factura pagada', {
              metadata: {
                webhook: 'invoice.paid',
                invoiceId: invoice.id,
              },
            })
          }
          break

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object
          const failedCustomerId =
            typeof failedInvoice.customer === 'string'
              ? failedInvoice.customer
              : failedInvoice.customer?.id

          if (failedCustomerId) {
            const customerWithFailed = await this.prisma.user.findFirst({
              where: { idStripeCustomer: failedCustomerId },
            })

            if (customerWithFailed) {
              await this.prisma.subscriptionBase.updateMany({
                where: {
                  userId: customerWithFailed.id,
                  status: 'active',
                },
                data: { status: 'payment_failed' },
              })

              paymentLogger.info(
                `Suscripción marcada como fallida para usuario ${customerWithFailed.email}`,
              )
            }
          }

          paymentLogger.error(`Pago fallido: ${failedInvoice.id}`, {
            customerId: failedCustomerId,
            attempts: failedInvoice.attempt_count,
          })
          break

        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription
          const subItem = subscription.items?.data[0]

          if (subItem) {
            const subProductId =
              typeof subItem.price?.product === 'string'
                ? subItem.price.product
                : subItem.price?.product?.id || 'emprendedor'

            const subInterval = subItem.plan?.interval

            // Buscar al usuario en la base de datos
            const user = await this.prisma.user.findFirst({
              where: { idStripeCustomer: subscription.customer as string },
            })

            if (user) {
              // Cancelar cualquier suscripción activa anterior en Stripe
              const activeSubscriptions = await this.stripe.subscriptions.list({
                customer: subscription.customer as string,
                status: 'active',
              })

              for (const activeSub of activeSubscriptions.data) {
                if (activeSub.id !== subscription.id) {
                  await this.stripe.subscriptions.cancel(activeSub.id)

                  paymentLogger.info(
                    `Suscripción anterior cancelada en Stripe: ${activeSub.id}`,
                  )
                }
              }

              // Manejar el cambio de suscripción en la base de datos
              const subscriptionResult = await handleSubscriptionChange(
                subscription,
                subInterval === 'year' ? 'anual' : 'mensual',
                subProductId,
              )

              paymentLogger.info(`Suscripción registrada`, {
                metadata: {
                  webhook: 'customer.subscription.updated',
                  customerIdStripe: subscription.customer,
                  subscriptionBaseId: subscriptionResult.subscription?.id,
                },
              })
            } else {
              paymentLogger.error(
                'Usuario no encontrado para el cliente de Stripe',
                {
                  customerIdStripe: subscription.customer,
                },
              )
            }
          }
          break

        case 'subscription_schedule.completed':
          const schedule = event.data.object
          await handleSubscriptionScheduleCompleted(schedule)
          break

        default:
          //console.log(`Evento no manejado: ${event.type}`)
          break
      }

      return { received: true }
    } catch (error) {
      paymentLogger.error(`Error webhook: ${error.message}`)
      throw new BadRequestException('Error procesando webhook')
    }
  }

  async cancelSubscriptionAtPeriodEnd(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new BadRequestException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        throw new BadRequestException('No se encontraron suscripciones activas')
      }

      const subscriptionId = subscriptions.data[0].id

      //actualizar la suscripción para cancelarla al final del periodo
      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        },
      )

      return {
        success: true,
        message: 'La suscripción se cancelará al final del periodo actual',
        subscription: updatedSubscription,
      }
    } catch (error) {
      console.error('Error al cancelar la suscripción:', error.message)
      throw new BadRequestException(
        `Error al cancelar la suscripción: ${error.message}`,
      )
    }
  }
}
