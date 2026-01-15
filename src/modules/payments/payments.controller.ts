import {
  Controller,
  Body,
  Post,
  Headers,
  UseGuards,
  Request,
  Get,
  BadRequestException,
  RawBodyRequest,
  Query,
} from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { AuthGuard } from '@nestjs/passport'
import { paymentLogger } from 'src/utils/logger'
import { ClientInfo } from 'src/utils/client-info'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @UseGuards(AuthGuard('jwt'))
  async createCheckoutSession(
    @Body()
    body: {
      period: 'mes' | 'año'
      productType:
        | 'etiqueta-emprendedor'
        | 'etiqueta-pro'
        | 'etiqueta-corporativo'
      userCount: number
    },
    @Request() req,
  ) {
    const userEmail = req.user.email

    paymentLogger.info(`Starting checkout session creation`, {
      metadata: {
        ...ClientInfo.getClientInfo(req),
        action: 'CREATE_CHECKOUT_SESSION',
      },
      request: {
        email: userEmail,
        period: body.period,
        productType: body.productType,
        userCount: body.userCount,
      },
    })

    const session = await this.paymentsService.createCheckoutSession(
      userEmail,
      body.period,
      body.productType,
      body.userCount,
    )

    return { url: session.url }
  }

  @Post('portal-session')
  @UseGuards(AuthGuard('jwt'))
  async createPortalSession(
    @Body()
    body: {
      action: 'downgrade' | 'upgrade' | 'cancel'
      selectedProduct: 'emprendedor' | 'pro' | 'corporativo'
      period?: string
      userCount?: number
    },
    @Request() req,
  ) {
    const userEmail = req.user.email
    const { action, selectedProduct, period, userCount } = body

    if (!action || !selectedProduct) {
      throw new BadRequestException(
        'La acción y el producto seleccionado son obligatorios',
      )
    }

    try {
      const session = await this.paymentsService.createPortalSession(
        userEmail,
        action,
        selectedProduct,
        period,
        userCount,
      )

      return { success: true, url: session.url }
    } catch (error) {
      console.error('Error al crear la sesión del portal:', error.message)
      throw new BadRequestException(
        `Error al crear la sesión del portal: ${error.message}`,
      )
    }
  }

  @Post('upgrade')
  @UseGuards(AuthGuard('jwt'))
  async handleUpgrade(
    @Body()
    body: {
      period: 'mes' | 'año'
      selectedProduct: 'emprendedor' | 'pro' | 'corporativo'
      userCount: number
    },
    @Request() req,
  ) {
    const userEmail = req.user.email
    const { period, selectedProduct, userCount } = body

    if (!period || !selectedProduct) {
      throw new BadRequestException(
        'El período y el producto seleccionado son obligatorios',
      )
    }

    try {
      const session = await this.paymentsService.handleUpgrade(
        userEmail,
        period,
        selectedProduct,
        userCount || 1,
      )

      return { success: true, url: session.url }
    } catch (error) {
      console.error('Error al manejar el upgrade:', error.message)
      throw new BadRequestException(
        `Error al manejar el upgrade: ${error.message}`,
      )
    }
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Request() req: RawBodyRequest<Request>,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('No se recibió el raw body del webhook')
    }

    if (!signature) {
      throw new BadRequestException('No se recibió la firma del webhook')
    }

    const result = await this.paymentsService.handleWebhook(
      req.rawBody,
      signature,
    )

    return { message: 'Webhook procesado correctamente', ...result }
  }

  @Post('cancel-subscription')
  @UseGuards(AuthGuard('jwt'))
  async cancelSubscriptionAtPeriodEnd(@Request() req) {
    const userId = req.user.id

    try {
      const result =
        await this.paymentsService.cancelSubscriptionAtPeriodEnd(userId)
      return {
        success: true,
        message: result.message,
        subscription: result.subscription,
      }
    } catch (error) {
      console.error('Error al cancelar la suscripción:', error.message)
      throw new BadRequestException(
        `Error al cancelar la suscripción: ${error.message}`,
      )
    }
  }
}
