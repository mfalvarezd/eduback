import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Twilio from 'twilio'

@Injectable()
export class TwilioService {
  private client: Twilio.Twilio
  private senderNumber: string

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID')
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN')
    this.senderNumber =
      this.configService.get<string>('TWILIO_PHONE_NUMBER') || ''

    if (!accountSid || !authToken || !this.senderNumber) {
      throw new Error('Twilio credentials are not set correctly.')
    }

    this.client = Twilio(accountSid, authToken)
  }

  async sendSms(to: string, message: string) {
    try {
      const response = await this.client.messages.create({
        body: message,
        from: this.senderNumber,
        to,
      })
      return response
    } catch (error) {
      throw new Error(`Error enviando SMS: ${(error as Error).message}`)
    }
  }
}
