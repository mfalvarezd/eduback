import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import Stripe from 'stripe'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MailService } from '../mail/mail.service'

@Injectable()
export class BillsService {
  private stripe: Stripe

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    })
  }

  async getBillingHistory(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const invoices = await this.stripe.invoices.list({
        customer: user.idStripeCustomer,
        limit: 50,
        expand: ['data.lines.data.plan'],
      })

      const productIds = invoices.data
        .flatMap((invoice) => invoice.lines.data || [])
        .filter((line) => line.plan && typeof line.plan.product === 'string')
        .map((line) => (line.plan ? (line.plan.product as string) : null))
        .filter((product): product is string => product !== null)
        .filter((id, index, self) => self.indexOf(id) === index)

      const products =
        productIds.length > 0
          ? (
              await Promise.all(
                productIds.map((id) => this.stripe.products.retrieve(id)),
              )
            ).reduce(
              (acc, product) => {
                acc[product.id] = product
                return acc
              },
              {} as Record<string, Stripe.Product>,
            )
          : {}

      return invoices.data.map((invoice) => {
        let planName = 'Desconocido'
        let period = ''

        if (invoice.lines?.data?.length > 0) {
          const lineItem = invoice.lines.data[0]

          if (lineItem.plan) {
            period = lineItem.plan.interval === 'month' ? 'Mensual' : 'Anual'

            if (typeof lineItem.plan.product === 'string') {
              const product = products[lineItem.plan.product]
              if (product) {
                planName = product.name || 'Desconocido'
              }
            }
          }
        }

        const invoiceDate = new Date(invoice.created * 1000)
        const formattedDate = format(invoiceDate, 'd MMM yyyy', { locale: es })
        return {
          id: invoice.id,
          fecha: formattedDate,
          tipo: 'Suscripción',
          numeroFactura: invoice.number || `FAC-${invoice.id.substring(0, 8)}`,
          plan: planName,
          periodo: period,
          estado: this.mapInvoiceStatus(invoice.status || 'unknown'),
          monto: `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
          descargarPdf: invoice.invoice_pdf || null,
          visualizarPdf: invoice.hosted_invoice_url || null,
        }
      })
    } catch (error) {
      throw new Error(
        `Error al obtener historial de facturación: ${error.message}`,
      )
    }
  }

  async getBillingDetails(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          idStripeCustomer: true,
        },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const customer = await this.stripe.customers.retrieve(
        user.idStripeCustomer,
      )

      if ('deleted' in customer) {
        throw new NotFoundException(
          'La información de facturación no está disponible',
        )
      }

      const billingDetails = {
        nombre: customer.name || '',
        email: customer.email || '',
        telefono: customer.phone || '',
        pais: customer.address?.country || '',
        ciudad: customer.address?.city || '',
        direccion: customer.address?.line1 || '',
        codigoPostal: customer.address?.postal_code || '',
        estado: customer.address?.state || '',
      }

      const cleanBillingDetails = Object.fromEntries(
        Object.entries(billingDetails).filter(([_, value]) => value !== ''),
      )

      return cleanBillingDetails
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al obtener datos de facturación: ${error.message}`,
        )
      }

      throw new Error(
        `Error al obtener detalles de facturación: ${error.message}`,
      )
    }
  }

  async getPaymentMethods(userId: string, periodo?: 'mes' | 'año') {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.idStripeCustomer,
        type: 'card',
      })

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        expand: ['data.default_payment_method', 'data.items.data.plan'],
        status: 'active',
      })

      const invoices = await this.stripe.invoices.list({
        customer: user.idStripeCustomer,
        limit: 10,
      })

      const paymentMethodIdToInvoice = new Map()

      for (const subscription of subscriptions.data) {
        if (!subscription.items?.data?.length) {
          continue
        }

        const subscriptionItem = subscription.items.data[0]
        const plan = subscriptionItem?.plan

        if (!plan) continue

        const subscriptionPeriodo =
          plan.interval === 'month' ? 'Mensual' : 'Anual'

        if (periodo) {
          const periodoFiltro = periodo === 'mes' ? 'Mensual' : 'Anual'
          if (subscriptionPeriodo !== periodoFiltro) {
            continue
          }
        }

        const paymentMethodId = subscription.default_payment_method
          ? typeof subscription.default_payment_method === 'string'
            ? subscription.default_payment_method
            : subscription.default_payment_method.id
          : null

        const lastInvoice = invoices.data.find(
          (invoice) => invoice.subscription === subscription.id,
        )

        const montoUltimoPago = lastInvoice
          ? `${(lastInvoice.amount_paid / 100).toFixed(2)} ${lastInvoice.currency.toUpperCase()}`
          : 'No disponible'

        const fechaProximoPago = subscription.cancel_at_period_end
          ? 'Cancelada al final del periodo'
          : subscription.current_period_end
            ? format(
                new Date(subscription.current_period_end * 1000),
                'd MMM yyyy',
                { locale: es },
              )
            : 'No disponible'

        if (paymentMethodId) {
          paymentMethodIdToInvoice.set(paymentMethodId, {
            montoUltimoPago,
            fechaProximoPago,
            periodo: subscriptionPeriodo,
          })
        }
      }

      let defaultPeriodo = 'Mensual'
      const periodos = Array.from(paymentMethodIdToInvoice.values()).map(
        (info) => info.periodo,
      )
      if (periodos.length > 0) {
        const mensualCount = periodos.filter((p) => p === 'Mensual').length
        const anualCount = periodos.filter((p) => p === 'Anual').length
        defaultPeriodo = mensualCount >= anualCount ? 'Mensual' : 'Anual'
      }

      return paymentMethods.data.map((method) => {
        if (!method.card) {
          return {
            id: method.id,
            tipo: 'Desconocido',
            detalles: 'Método de pago no disponible',
            montoUltimoPago: 'No disponible',
            fechaProximoPago: 'No disponible',
            periodo: defaultPeriodo,
          }
        }

        const pagoInfo = paymentMethodIdToInvoice.get(method.id) || {
          montoUltimoPago: 'No disponible',
          fechaProximoPago: 'No disponible',
          periodo: defaultPeriodo,
        }

        return {
          id: method.id,
          tipo: 'Tarjeta',
          detalles: `${this.capitalizeFirstLetter(method.card.brand)} •••• ${
            method.card.last4
          }`,
          tipoTarjeta: this.mapCardFunding(method.card.funding),
          expiracion: `${method.card.exp_month}/${method.card.exp_year}`,
          predeterminado: method.metadata?.default === 'true',
          montoUltimoPago: pagoInfo.montoUltimoPago,
          fechaProximoPago: pagoInfo.fechaProximoPago,
          periodo: pagoInfo.periodo,
        }
      })
    } catch (error) {
      throw new Error(`Error al obtener métodos de pago: ${error.message}`)
    }
  }

  private mapCardFunding(funding?: string): string {
    switch (funding) {
      case 'credit':
        return 'Crédito'
      case 'debit':
        return 'Débito'
      case 'prepaid':
        return 'Prepago'
      case 'unknown':
      default:
        return 'Desconocido'
    }
  }

  private mapInvoiceStatus(status: string): string {
    const statusMap = {
      paid: 'Pagado',
      open: 'Pendiente',
      void: 'Anulado',
      uncollectible: 'Incobrable',
      draft: 'Borrador',
    }

    return statusMap[status] || 'Desconocido'
  }

  private capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1)
  }

  async sendInvoiceByEmail(userId: string, invoiceId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          idStripeCustomer: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      })

      if (!user || !user.idStripeCustomer || !user.email) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de contacto',
        )
      }

      const invoice = await this.stripe.invoices.retrieve(invoiceId, {
        expand: ['subscription', 'subscription.plan.product'],
      })

      const customerId =
        typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id

      if (customerId !== user.idStripeCustomer) {
        throw new NotFoundException('Factura no encontrada para este usuario')
      }

      const invoiceDate = new Date(invoice.created * 1000)
      const formattedDate = format(invoiceDate, 'd MMM yyyy', { locale: es })
      const invoiceNumber =
        invoice.number || `FAC-${invoice.id.substring(0, 8)}`
      const amount = `${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`

      let planName = 'Suscripción'
      const planProduct = (invoice.subscription as any)?.plan?.product
      if (planProduct && typeof planProduct === 'object') {
        planName = planProduct.name || 'Suscripción'
      }

      const fullName =
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        'Estimado cliente'
      const pdfUrl = invoice.invoice_pdf
      const viewUrl = invoice.hosted_invoice_url

      if (!pdfUrl) {
        throw new Error('No se encontró el PDF de la factura')
      }

      const html = this.getInvoiceEmailTemplate(
        fullName,
        invoiceNumber,
        formattedDate,
        planName,
        amount,
        pdfUrl,
        viewUrl || pdfUrl,
      )

      await this.mailService.sendInvoiceEmail(
        user.email,
        `Factura ${invoiceNumber} - Solinal`,
        html,
      )

      return {
        success: true,
        message: `Factura enviada exitosamente a ${user.email}`,
      }
    } catch (error) {
      throw new Error(`Error al enviar factura por correo: ${error.message}`)
    }
  }

  private getInvoiceEmailTemplate(
    name: string,
    invoiceNumber: string,
    date: string,
    plan: string,
    amount: string,
    pdfUrl: string,
    viewUrl: string,
  ): string {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #dcdcdc; border-radius: 10px; background-color: #ffffff;">
      
      <h2 style="color: #051e46; text-align: center; margin-bottom: 25px; font-size: 22px; border-bottom: 2px solid #1ed493; padding-bottom: 15px;">
        Su factura de suscripción está disponible
      </h2>
      
      <p style="margin-bottom: 18px; color: #333;">Estimado/a <strong>${name}</strong>,</p>
      
      <p style="margin-bottom: 20px; color: #333;">
        Le agradecemos por confiar en <strong>Solinal</strong>. A continuación, encontrará los detalles correspondientes a su factura. 
        El documento se encuentra disponible para su descarga o revisión en línea.
      </p>
      
      <div style="background-color: #f4f9f6; border-radius: 8px; padding: 20px; margin-bottom: 30px; border-left: 5px solid #1ed493;">
        <p style="color: #051e46; margin: 8px 0;"><strong>Número de factura:</strong> ${invoiceNumber}</p>
        <p style="color: #051e46; margin: 8px 0;"><strong>Fecha de emisión:</strong> ${date}</p>
        <p style="color: #051e46; margin: 8px 0;"><strong>Plan contratado:</strong> ${plan}</p>
        <p style="color: #051e46; margin: 8px 0;"><strong>Importe:</strong> ${amount}</p>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${pdfUrl}" style="display: inline-block; background-color: #1ed493; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
          Descargar factura (PDF)
        </a>
        <a href="${viewUrl}" style="display: inline-block; background-color: #051e46; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Ver en línea
        </a>
      </div>
      
      <p style="margin-bottom: 20px; color: #333;">
        En caso de que tenga alguna consulta respecto a este documento o requiera asistencia adicional, no dude en ponerse en contacto con nuestro equipo de soporte.
      </p>
      
      <p style="margin-bottom: 5px; color: #333;">Atentamente,</p>
      <p style="font-weight: bold; color: #051e46;">Equipo de Solinal</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; text-align: center; color: #777; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Solinal. Todos los derechos reservados.</p>
      </div>
    </div>
    `
  }

  async updateBillingDetails(
    userId: string,
    billingDetails: {
      nombre: string
      ciudad: string
      pais: string
      direccion: string
    },
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      await this.stripe.customers.update(user.idStripeCustomer, {
        name: billingDetails.nombre,
        address: {
          country: billingDetails.pais,
          city: billingDetails.ciudad,
          line1: billingDetails.direccion,
        },
      })

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: user.idStripeCustomer,
        type: 'card',
      })

      const defaultPaymentMethod =
        paymentMethods.data.find(
          (method) => method.metadata?.default === 'true',
        ) || paymentMethods.data[0]

      if (defaultPaymentMethod) {
        await this.stripe.paymentMethods.update(defaultPaymentMethod.id, {
          billing_details: {
            name: billingDetails.nombre,
            address: {
              country: billingDetails.pais,
              city: billingDetails.ciudad,
              line1: billingDetails.direccion,
            },
          },
        })
      }

      return {
        success: true,
        message: 'Información de facturación actualizada correctamente',
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al actualizar datos de facturación: ${error.message}`,
        )
      }

      throw new Error(
        `Error al actualizar detalles de facturación: ${error.message}`,
      )
    }
  }

  async addPaymentMethod(
    userId: string,
    paymentInfo: {
      tipo: 'tarjeta' | 'paypal'
      paymentMethodId?: string
      returnUrl?: string
    },
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true, email: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      if (paymentInfo.tipo === 'tarjeta') {
        if (!paymentInfo.paymentMethodId) {
          throw new Error('Se requiere el ID del método de pago')
        }

        await this.stripe.paymentMethods.attach(paymentInfo.paymentMethodId, {
          customer: user.idStripeCustomer,
        })

        const existingMethods = await this.stripe.paymentMethods.list({
          customer: user.idStripeCustomer,
          type: 'card',
        })

        if (existingMethods.data.length === 1) {
          await this.stripe.paymentMethods.update(paymentInfo.paymentMethodId, {
            metadata: { default: 'true' },
          })
        }

        return {
          success: true,
          message: 'Método de pago con tarjeta agregado correctamente',
          paymentMethodId: paymentInfo.paymentMethodId,
        }
      } else if (paymentInfo.tipo === 'paypal') {
        //falta implementar
        return {
          success: true,
          message: 'Sesión de vinculación de PayPal creada',
          isPayPal: true,
        }
      } else {
        throw new Error('Tipo de método de pago no soportado')
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al agregar método de pago: ${error.message}`,
        )
      }
      throw new Error(`Error al agregar método de pago: ${error.message}`)
    }
  }

  async confirmPayPalSetup(userId: string, sessionId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['setup_intent'],
      })

      if (
        session.customer !== user.idStripeCustomer ||
        session.status !== 'complete'
      ) {
        throw new Error('Sesión de PayPal inválida o no completada')
      }

      const setupIntent = session.setup_intent as Stripe.SetupIntent
      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error('No se pudo obtener el método de pago de PayPal')
      }

      const existingMethods = await this.stripe.paymentMethods.list({
        customer: user.idStripeCustomer,
        type: 'card',
      })

      const paypalMethods = existingMethods.data.filter(
        (method) =>
          method.id.startsWith('pm_') &&
          (method.card?.brand === 'unknown' ||
            method.metadata?.paypal === 'true'),
      )

      if (paypalMethods.length === 1) {
        const paymentMethodId =
          typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method.id

        await this.stripe.paymentMethods.update(paymentMethodId, {
          metadata: { default: 'true', paypal: 'true' },
        })
      }

      return {
        success: true,
        message: 'Método de pago con PayPal vinculado correctamente',
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(`Error de Stripe al confirmar PayPal: ${error.message}`)
      }
      throw new Error(`Error al confirmar método PayPal: ${error.message}`)
    }
  }

  async getCurrentSubscriptionPaymentMethod(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        status: 'active',
        limit: 1,
        expand: ['data.default_payment_method', 'data.items.data.plan'],
      })

      if (subscriptions.data.length === 0) {
        throw new NotFoundException('No se encontró ninguna suscripción activa')
      }

      const subscription = subscriptions.data[0]

      // Verificar si la suscripción está marcada para cancelarse al final del periodo
      const isCancelAtPeriodEnd = subscription.cancel_at_period_end

      const planItem = subscription.items.data[0]
      const plan = planItem?.plan
      const periodo = plan?.interval === 'month' ? 'mensual' : 'anual'
      const cantidad = planItem?.quantity || 1
      const precioUnitario = plan?.amount ? plan.amount / 100 : 0
      const montoTotal = precioUnitario * cantidad
      const moneda = plan?.currency?.toUpperCase() || 'USD'

      const montoPago = `$${montoTotal.toFixed(2)}/${periodo}`

      // Si la suscripción está marcada para cancelarse, no mostrar la fecha de próximo pago
      const fechaProximoPago = isCancelAtPeriodEnd
        ? 'Cancelada al final del periodo'
        : subscription.current_period_end
          ? format(
              new Date(subscription.current_period_end * 1000),
              'd MMM yyyy',
              { locale: es },
            )
          : 'No disponible'

      let paymentMethod: Stripe.PaymentMethod | null = null
      let tarjetaInfo = 'No disponible'

      if (subscription.default_payment_method) {
        if (typeof subscription.default_payment_method === 'string') {
          paymentMethod = await this.stripe.paymentMethods.retrieve(
            subscription.default_payment_method,
          )
        } else {
          paymentMethod = subscription.default_payment_method
        }

        if (paymentMethod && paymentMethod.card) {
          const tipoTarjeta = this.mapCardFunding(paymentMethod.card.funding)
          tarjetaInfo = `${this.capitalizeFirstLetter(
            paymentMethod.card.brand,
          )} •••• ${paymentMethod.card.last4} (${tipoTarjeta})`
        } else if (paymentMethod && paymentMethod.metadata?.paypal === 'true') {
          tarjetaInfo = 'PayPal'
        }
      } else {
        const invoices = await this.stripe.invoices.list({
          customer: user.idStripeCustomer,
          subscription: subscription.id,
          limit: 1,
          expand: ['data.payment_intent'],
        })

        if (invoices.data.length > 0 && invoices.data[0].payment_intent) {
          const paymentIntent =
            typeof invoices.data[0].payment_intent === 'string'
              ? await this.stripe.paymentIntents.retrieve(
                  invoices.data[0].payment_intent,
                  {
                    expand: ['payment_method'],
                  },
                )
              : invoices.data[0].payment_intent

          if (paymentIntent.payment_method) {
            const pmDetails =
              typeof paymentIntent.payment_method === 'string'
                ? await this.stripe.paymentMethods.retrieve(
                    paymentIntent.payment_method,
                  )
                : paymentIntent.payment_method

            if (pmDetails.card) {
              const tipoTarjeta = this.mapCardFunding(pmDetails.card.funding)
              tarjetaInfo = `${this.capitalizeFirstLetter(
                pmDetails.card.brand,
              )} •••• ${pmDetails.card.last4} (${tipoTarjeta})`
            } else if (pmDetails.metadata?.paypal === 'true') {
              tarjetaInfo = 'PayPal'
            }
          }
        }
      }

      return {
        montoPago,
        fechaProximoPago,
        tarjetaInfo,
        detallesSuscripcion: {
          periodo,
          cantidadLicencias: cantidad,
          precioUnitario,
          montoTotal,
          moneda,
        },
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }

      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al obtener método de pago de la suscripción: ${error.message}`,
        )
      }

      throw new Error(
        `Error al obtener información del método de pago actual: ${error.message}`,
      )
    }
  }

  async replaceSubscriptionPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        status: 'active',
        limit: 1,
        expand: ['data.default_payment_method'],
      })

      if (subscriptions.data.length === 0) {
        throw new NotFoundException('No se encontró ninguna suscripción activa')
      }

      const subscription = subscriptions.data[0]
      const currentPaymentMethodId =
        typeof subscription.default_payment_method === 'string'
          ? subscription.default_payment_method
          : subscription.default_payment_method?.id

      if (!currentPaymentMethodId) {
        throw new Error(
          'No se encontró un método de pago asociado a la suscripción',
        )
      }

      //asociar el nuevo método de pago al cliente
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.idStripeCustomer,
      })

      //actualizar la suscripción para usar el nuevo método de pago
      await this.stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethodId,
      })

      return {
        success: true,
        message: 'Método de pago reemplazado correctamente',
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al reemplazar el método de pago: ${error.message}`,
        )
      }
      throw new Error(`Error al reemplazar el método de pago: ${error.message}`)
    }
  }

  async replaceSubscriptionPaymentMethodWithExisting(
    userId: string,
    paymentMethodId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { idStripeCustomer: true },
      })

      if (!user || !user.idStripeCustomer) {
        throw new NotFoundException(
          'Usuario no encontrado o sin información de facturación',
        )
      }

      const paymentMethod =
        await this.stripe.paymentMethods.retrieve(paymentMethodId)
      if (paymentMethod.customer !== user.idStripeCustomer) {
        throw new Error('El método de pago no pertenece al cliente')
      }

      const subscriptions = await this.stripe.subscriptions.list({
        customer: user.idStripeCustomer,
        status: 'active',
        limit: 1,
        expand: ['data.default_payment_method'],
      })

      if (subscriptions.data.length === 0) {
        throw new NotFoundException('No se encontró ninguna suscripción activa')
      }

      const subscription = subscriptions.data[0]

      //actualizar la suscripción para usar el nuevo método de pago
      await this.stripe.subscriptions.update(subscription.id, {
        default_payment_method: paymentMethodId,
      })

      return {
        success: true,
        message: 'Método de pago actualizado correctamente',
      }
    } catch (error) {
      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Error de Stripe al reemplazar el método de pago: ${error.message}`,
        )
      }
      throw new Error(`Error al reemplazar el método de pago: ${error.message}`)
    }
  }
}
