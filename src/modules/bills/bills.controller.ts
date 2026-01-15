import { Controller, Get, Request, Param, Post, Body } from '@nestjs/common'
import { BillsService } from './bills.service'
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Controller('bills')
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('history')
  async getBillingHistory(@Request() req) {
    const userId = req.user.id
    return await this.billsService.getBillingHistory(userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('details')
  async getBillingDetails(@Request() req) {
    const userId = req.user.id
    return await this.billsService.getBillingDetails(userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('payment-methods')
  async getPaymentMethods(@Request() req) {
    const userId = req.user.id
    return await this.billsService.getPaymentMethods(userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('current-subscription-payment')
  async getCurrentSubscriptionPaymentMethod(@Request() req) {
    const userId = req.user.id
    return await this.billsService.getCurrentSubscriptionPaymentMethod(userId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':invoiceId/send-email')
  async sendInvoiceByEmail(
    @Request() req,
    @Param('invoiceId') invoiceId: string,
  ) {
    const userId = req.user.id
    return await this.billsService.sendInvoiceByEmail(userId, invoiceId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('update-billing-details')
  async updateBillingDetails(
    @Request() req,
    @Body()
    billingDetails: {
      nombre: string
      ciudad: string
      pais: string
      direccion: string
    },
  ) {
    const userId = req.user.id
    return await this.billsService.updateBillingDetails(userId, billingDetails)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('add-payment-method')
  async addPaymentMethod(
    @Request() req,
    @Body()
    paymentInfo: {
      tipo: 'tarjeta' | 'paypal'
      paymentMethodId?: string
      returnUrl?: string
    },
  ) {
    const userId = req.user.id
    return await this.billsService.addPaymentMethod(userId, paymentInfo)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('confirm-paypal')
  async confirmPayPalSetup(
    @Request() req,
    @Body() body: { sessionId: string },
  ) {
    const userId = req.user.id
    return await this.billsService.confirmPayPalSetup(userId, body.sessionId)
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('replace-subscription-payment-method')
  async replaceSubscriptionPaymentMethod(
    @Request() req,
    @Body() body: { paymentMethodId: string },
  ) {
    const userId = req.user.id

    if (!body.paymentMethodId) {
      throw new Error('El ID del método de pago es obligatorio')
    }

    return await this.billsService.replaceSubscriptionPaymentMethod(
      userId,
      body.paymentMethodId,
    )
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('replace-subscription-payment-method-existing')
  async replaceSubscriptionPaymentMethodWithExisting(
    @Request() req,
    @Body() body: { paymentMethodId: string },
  ) {
    const userId = req.user.id

    if (!body.paymentMethodId) {
      throw new Error('El ID del método de pago es obligatorio')
    }

    return await this.billsService.replaceSubscriptionPaymentMethodWithExisting(
      userId,
      body.paymentMethodId,
    )
  }
}
