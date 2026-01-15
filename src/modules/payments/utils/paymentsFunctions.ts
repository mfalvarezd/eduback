import {
  productToPriceID,
  productToPriceIDAnnually,
  STRIPE_PRODUCT_MAPPING,
} from '../products/productListId'
import { paymentLogger } from 'src/utils/logger'
import { retrieveSubscription } from '../stripe'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const getPlanLevel = (priceId: string): number => {
  const priceToLevel: { [key: string]: number } = {}

  if (productToPriceID['etiqueta-emprendedor']) {
    priceToLevel[productToPriceID['etiqueta-emprendedor']] = 1
  }
  if (productToPriceID['etiqueta-pro']) {
    priceToLevel[productToPriceID['etiqueta-pro']] = 2
  }
  if (productToPriceID['etiqueta-corporativo']) {
    priceToLevel[productToPriceID['etiqueta-corporativo']] = 3
  }

  if (productToPriceIDAnnually['etiqueta-emprendedor']) {
    priceToLevel[productToPriceIDAnnually['etiqueta-emprendedor']] = 1
  }
  if (productToPriceIDAnnually['etiqueta-pro']) {
    priceToLevel[productToPriceIDAnnually['etiqueta-pro']] = 2
  }
  if (productToPriceIDAnnually['etiqueta-corporativo']) {
    priceToLevel[productToPriceIDAnnually['etiqueta-corporativo']] = 3
  }

  return priceToLevel[priceId] || 0
}

export const getProductTypeFromPriceId = (priceId: string): string | null => {
  for (const [key, value] of Object.entries(productToPriceID)) {
    if (value === priceId) {
      return key
    }
  }

  for (const [key, value] of Object.entries(productToPriceIDAnnually)) {
    if (value === priceId) {
      return key
    }
  }

  return null
}

export const handleSubscriptionScheduleCompleted = async (schedule: any) => {
  try {
    const subscriptionId = schedule.subscription
    if (!subscriptionId) {
      paymentLogger.error('Schedule sin suscripción asociada', {
        scheduleId: schedule.id,
      })
      return
    }

    const subscription = await retrieveSubscription(subscriptionId)
    const customer = subscription.customer

    const user = await prisma.user.findFirst({
      where: {
        idStripeCustomer: typeof customer === 'string' ? customer : customer.id,
      },
    })

    if (!user) {
      paymentLogger.error(
        'No se encontró el usuario asociado con el schedule',
        {
          scheduleId: schedule.id,
          customerId: customer,
        },
      )
      return
    }

    const currentPriceId = subscription.items.data[0].price.id
    const productType = getProductTypeFromPriceId(currentPriceId)

    if (!productType) {
      paymentLogger.error('No se pudo determinar el tipo de producto', {
        priceId: currentPriceId,
      })
      return
    }

    const planName = STRIPE_PRODUCT_MAPPING[productType]
    if (!planName) {
      paymentLogger.error('Plan no configurado para el producto', {
        productType,
      })
      return
    }

    const plan = await prisma.plan.findFirst({
      where: { name: planName },
    })

    if (!plan) {
      paymentLogger.error('Plan no encontrado en la base de datos', {
        planName,
      })
      return
    }

    const startDate = new Date()
    let endDate = new Date(startDate)

    const interval = subscription.items.data[0].plan.interval
    if (interval === 'month') {
      let tempMonth = endDate.getMonth() + 1
      endDate.setMonth(tempMonth)

      if (endDate.getDate() !== startDate.getDate()) {
        endDate.setDate(0)
      }
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    const existingSubscription = await prisma.subscriptionBase.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'complete', 'paid'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!existingSubscription) {
      await prisma.subscriptionBase.create({
        data: {
          type: 'INDIVIDUAL',
          status: 'active',
          startDate,
          endDate,
          userId: user.id,
          planId: plan.id,
        },
      })

      paymentLogger.info(
        `Nueva suscripción creada después del downgrade programado`,
        {
          userId: user.id,
          email: user.email,
          newPlan: planName,
        },
      )
    } else {
      await prisma.subscriptionBase.update({
        where: { id: existingSubscription.id },
        data: {
          planId: plan.id,
          startDate,
          endDate,
        },
      })

      paymentLogger.info(
        `Suscripción actualizada después del downgrade programado`,
        {
          subscriptionId: existingSubscription.id,
          userId: user.id,
          email: user.email,
          previousPlan: existingSubscription.planId,
          newPlan: plan.id,
        },
      )
    }
  } catch (error) {
    paymentLogger.error(
      `Error al manejar subscription_schedule.completed: ${error.message}`,
      {
        stack: error.stack,
        scheduleId: schedule?.id,
      },
    )
  }
}

export const handleSubscriptionChange = async (
  subscription: any,
  typeSub: 'mensual' | 'anual',
  newPlanType: string,
) => {
  try {
    const { customer: stripeCustomerId, status } = subscription

    const startDate = new Date()
    let endDate = new Date(startDate)

    if (typeSub === 'mensual') {
      let tempMonth = endDate.getMonth() + 1
      endDate.setMonth(tempMonth)

      if (endDate.getDate() !== startDate.getDate()) {
        endDate.setDate(0)
      }
    } else if (typeSub === 'anual') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    const user = await prisma.user.findFirst({
      where: { idStripeCustomer: stripeCustomerId },
    })

    if (!user) throw new Error(`Usuario no encontrado`)

    const planName = STRIPE_PRODUCT_MAPPING[newPlanType]
    if (!planName) throw new Error(`Plan no configurado: ${newPlanType}`)

    const plan = await prisma.plan.findFirst({
      where: { name: planName },
    })
    if (!plan) throw new Error(`Plan no encontrado: ${planName}`)

    const existingSubscription = await prisma.subscriptionBase.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'complete', 'paid'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const subscriptionData = {
      type: 'INDIVIDUAL' as const,
      status: 'active',
      startDate: startDate,
      endDate: endDate,
      userId: user.id,
      planId: plan.id,
    }

    let updatedSubscription

    if (existingSubscription) {
      updatedSubscription = await prisma.subscriptionBase.update({
        where: { id: existingSubscription.id },
        data: subscriptionData,
      })
    } else {
      updatedSubscription = await prisma.subscriptionBase.create({
        data: subscriptionData,
      })
    }

    return { success: true, subscription: updatedSubscription }
  } catch (error) {
    paymentLogger.error(`Error suscripción: ${error.message}`, {
      stack: error.stack,
      planType: newPlanType,
      period: typeSub,
    })
    return { success: false, error: error.message }
  }
}
